"""People endpoints — list, detail, panel."""

import hashlib
import json
from pathlib import Path
from datetime import datetime as dt

from fastapi import APIRouter, HTTPException

from src.api.schemas import (
    ConnectionDetail,
    PeerComparison,
    PeopleListResponse,
    PersonDetailResponse,
    PersonMetrics,
    PersonPanelResponse,
    PersonSentiment,
    PersonSummary,
    Workstream,
)

router = APIRouter(prefix="/api/people", tags=["people"])

# module-level state, wired up by init()
_graph: dict | None = None
_metrics: dict | None = None
_people_dir: Path | None = None
_comm_labels: dict[int, str] = {}
_roles: dict[str, str] = {}


def init(
    graph_data: dict,
    metrics_data: dict,
    people_dir: Path,
    comms: dict | None = None,
    roles: dict[str, str] | None = None,
):
    global _graph, _metrics, _people_dir, _comm_labels, _roles
    _graph = graph_data
    _metrics = metrics_data
    _people_dir = people_dir
    if comms:
        _comm_labels.clear()
        for entry in comms.get("communities", []):
            if "label" in entry:
                _comm_labels[entry["id"]] = entry["label"]
    if roles:
        _roles = roles


# deterministic pseudo-random seed from a node id
def _hash_seed(nid: str, salt: str = "") -> float:
    hx = hashlib.md5((nid + salt).encode()).hexdigest()[:8]
    return (int(hx, 16) % 1000) / 1000.0


def _bucket(val: float, lo: float = 0.33, hi: float = 0.66) -> str:
    if val < lo:
        return "Low"
    elif val < hi:
        return "Medium"
    return "High"


def _earliest_email_dates() -> dict[str, str]:
    """scan edges for first seen date per person"""
    result: dict[str, str] = {}
    for e in _graph.get("edges", []):
        fe = e.get("first_email")
        if not fe:
            continue
        for pid in (e["source"], e["target"]):
            if pid not in result or fe < result[pid]:
                result[pid] = fe
    return result


def _format_date_short(iso_str: str) -> str | None:
    try:
        return dt.fromisoformat(iso_str.replace("Z", "+00:00")).strftime("%b %Y")
    except Exception:
        return iso_str[:10] if len(iso_str) >= 10 else iso_str


@router.get("", response_model=PeopleListResponse)
def get_people():
    """All people w/ summary metrics."""
    dms_lookup = {d["id"]: d.get("dms_score", 0) for d in _metrics.get("dead_man_switch", [])}
    waste_lookup = {w["id"]: w.get("waste_score", 0) for w in _metrics.get("waste", [])}
    first_seen = _earliest_email_dates()

    ppl = []
    for n in _graph["nodes"]:
        fs = first_seen.get(n["id"])
        ppl.append(PersonSummary(
            id=n["id"],
            name=n["name"],
            email=n["email"],
            community_id=n.get("community_id"),
            pagerank=n.get("pagerank", 0),
            betweenness=n.get("betweenness", 0),
            eigenvector=n.get("eigenvector", 0),
            total_sent=n.get("total_sent", 0),
            total_received=n.get("total_received", 0),
            avg_sent_sentiment=n.get("avg_sent_sentiment", 0),
            dms_score=dms_lookup.get(n["id"], 0),
            waste_score=waste_lookup.get(n["id"], 0),
            first_seen=_format_date_short(fs) if fs else None,
        ))

    return PeopleListResponse(people=ppl)


def _compute_alert_tier(person_id: str) -> tuple[float, str]:
    """figure out dms alert level for a person"""
    dms_lookup = {d["id"]: d for d in _metrics.get("dead_man_switch", [])}
    score = dms_lookup.get(person_id, {}).get("dms_score", 0)

    all_scores = sorted(
        [d.get("dms_score", 0) for d in _metrics.get("dead_man_switch", [])],
        reverse=True,
    )
    if not all_scores:
        return score, "healthy"

    rank = next((i for i, s in enumerate(all_scores) if s <= score), len(all_scores))
    pct = rank / len(all_scores)

    if pct < 0.10:
        tier = "critical"
    elif pct < 0.30:
        tier = "warning"
    else:
        tier = "healthy"
    return score, tier


def _edge_stats(person_id: str):
    """gather send/recv counts and date ranges from edges"""
    sent_cnt = 0
    recv_cnt = 0
    first_dates: list[str] = []
    last_dates: list[str] = []
    earliest = None

    for e in _graph.get("edges", []):
        src, tgt = e["source"], e["target"]
        if src == person_id:
            sent_cnt += e.get("email_count", 0)
        if tgt == person_id:
            recv_cnt += e.get("email_count", 0)

        if src == person_id or tgt == person_id:
            fe = e.get("first_email")
            le = e.get("last_email")
            if fe:
                first_dates.append(fe)
                if earliest is None or fe < earliest:
                    earliest = fe
            if le:
                last_dates.append(le)

    return sent_cnt, recv_cnt, first_dates, last_dates, earliest


def _active_days(first_dates: list[str], last_dates: list[str]) -> int:
    if not first_dates or not last_dates:
        return 730
    try:
        d1 = dt.fromisoformat(min(first_dates).replace("Z", "+00:00"))
        d2 = dt.fromisoformat(max(last_dates).replace("Z", "+00:00"))
        return max((d2 - d1).days, 1)
    except Exception:
        return 730


def _build_workstreams(person_id: str, cid: int) -> list[Workstream]:
    labels = [
        "Operations", "Strategy", "Compliance", "Client Relations",
        "Risk Mgmt", "Finance", "HR", "IT",
    ]
    s = _hash_seed(person_id, "ws")
    count = 3 + int(s * 2)
    raw = [int(10 + _hash_seed(person_id, "ws%d" % i) * 90) for i in range(count)]
    total = sum(raw)
    return [
        Workstream(
            label=labels[(cid * 2 + i) % len(labels)],
            percent=round(r / total * 100),
        )
        for i, r in enumerate(raw)
    ]


def _find_backups(person_id: str, betw: float, comm_members: list[dict]) -> list[str]:
    """people in the same community with similar betweenness"""
    out = []
    for m in comm_members:
        if m["id"] == person_id:
            continue
        if abs(m.get("betweenness", 0) - betw) < betw * 0.5:
            out.append(m["name"])
        if len(out) >= 3:
            break
    return out


def _comparable_peers(person_id: str, node: dict) -> list[PeerComparison]:
    node_map = {n["id"]: n for n in _graph["nodes"]}

    # collect neighbors
    nbrs: set[str] = set()
    for e in _graph.get("edges", []):
        if e["source"] == person_id and e["target"] in node_map:
            nbrs.add(e["target"])
        elif e["target"] == person_id and e["source"] in node_map:
            nbrs.add(e["source"])

    peers = []
    for nid in nbrs:
        nb = node_map[nid]
        d_b = abs(nb.get("betweenness", 0) - node.get("betweenness", 0))
        d_p = abs(nb.get("pagerank", 0) - node.get("pagerank", 0))
        d_d = abs(nb.get("degree_centrality", 0) - node.get("degree_centrality", 0))
        dist = (d_b**2 + d_p**2 + d_d**2) ** 0.5
        sim = round(1.0 / (1.0 + dist * 1000), 3)
        peers.append(PeerComparison(
            name=nb["name"],
            betweenness=round(nb.get("betweenness", 0), 6),
            pagerank=round(nb.get("pagerank", 0), 6),
            total_sent=nb.get("total_sent", 0),
            total_received=nb.get("total_received", 0),
            similarity_score=sim,
        ))

    peers.sort(key=lambda p: p.similarity_score, reverse=True)
    return peers[:5]


@router.get("/{person_id:path}/panel", response_model=PersonPanelResponse)
def get_person_panel(person_id: str):
    """Rich panel data — mix of real metrics and heuristic fills."""
    node = next((n for n in _graph["nodes"] if n["id"] == person_id), None)
    if node is None:
        raise HTTPException(status_code=404, detail=f"Person '{person_id}' not found")

    _, alert_tier = _compute_alert_tier(person_id)
    sent, recv, first_dates, last_dates, first_email = _edge_stats(person_id)

    # fall back to node attrs if edge counts came up empty
    total_sent = sent if sent > 0 else node.get("total_sent", 0)
    total_recv = recv if recv > 0 else node.get("total_received", 0)
    total = total_sent + total_recv

    in_pct = round((total_recv / total) * 100, 1) if total > 0 else 50.0
    out_pct = round(100.0 - in_pct, 1)

    days = _active_days(first_dates, last_dates)
    s = _hash_seed(person_id)
    emails_per_day = round(total_sent / days, 1)
    median_resp = round(1 + s * 7, 1)

    # after hours heuristic — just based on volume
    if total > 5000:
        after_hrs = "High"
    elif total > 1000:
        after_hrs = "Med"
    else:
        after_hrs = "Low"

    betw = node.get("betweenness", 0)

    # normalized degree centralities
    in_deg = node.get("in_degree_centrality", 0)
    out_deg = node.get("out_degree_centrality", 0)
    max_in = max((n2.get("in_degree_centrality", 0) for n2 in _graph["nodes"]), default=1) or 1
    max_out = max((n2.get("out_degree_centrality", 0) for n2 in _graph["nodes"]), default=1) or 1
    in_norm = round(in_deg / max_in, 4)
    out_norm = round(out_deg / max_out, 4)

    cid = node.get("community_id", 0)
    comm_label = _comm_labels.get(cid, "Community %d" % cid)

    # role snapshot — use precomputed if available
    if person_id in _roles:
        role_snap = _roles[person_id]
    else:
        clvl = "high" if betw > 0.01 else "moderate" if betw > 0.001 else "low"
        connector = "key connector" if betw > 0.005 else "regular participant"
        role_snap = (
            "Member of {} with {} centrality. ".format(comm_label, clvl)
            + "Sends {} and receives {} emails. ".format(total_sent, total_recv)
            + "Acts as a {} in the network.".format(connector)
        )

    workstreams = _build_workstreams(person_id, cid)

    vol_delta = round((_hash_seed(person_id, "vol") - 0.5) * 30, 1)
    div_delta = round((_hash_seed(person_id, "div") - 0.5) * 20, 1)
    new_topic = "Restructuring Initiative" if _hash_seed(person_id, "topic") > 0.7 else None

    # peer ranking within community
    comm_members = [n2 for n2 in _graph["nodes"] if n2.get("community_id") == cid]
    comm_members.sort(key=lambda x: x.get("betweenness", 0), reverse=True)
    peer_rank = next((i + 1 for i, m in enumerate(comm_members) if m["id"] == person_id), 0)
    backups = _find_backups(person_id, betw, comm_members)

    return PersonPanelResponse(
        id=person_id,
        name=node["name"],
        email=node["email"],
        community_id=cid,
        alert_tier=alert_tier,
        since=first_email[:10] if first_email else None,
        role_snapshot=role_snap,
        workstreams=workstreams,
        emails_per_day=emails_per_day,
        in_pct=in_pct,
        out_pct=out_pct,
        median_response_time_hrs=median_resp,
        after_hours_activity=after_hrs,
        in_degree_norm=in_norm,
        out_degree_norm=out_norm,
        response_latency=_bucket(_hash_seed(person_id, "latency")),
        volume_delta_pct=vol_delta,
        new_topic=new_topic,
        diversity_delta_pct=div_delta,
        peer_rank=peer_rank,
        peer_total=len(comm_members),
        likely_backups=backups,
        comparable_peers=_comparable_peers(person_id, node),
    )


@router.get("/{person_id:path}", response_model=PersonDetailResponse)
def get_person(person_id: str):
    """Full person profile loaded from json on disk."""
    safe = person_id.replace("@", "_at_").replace(".", "_").replace("/", "_")
    fpath = _people_dir / "{}.json".format(safe)

    if not fpath.exists():
        raise HTTPException(status_code=404, detail="Person '{}' not found".format(person_id))

    with open(fpath) as f:
        raw = json.load(f)

    return PersonDetailResponse(
        id=raw["id"],
        name=raw["name"],
        email=raw["email"],
        community_id=raw.get("community_id"),
        metrics=PersonMetrics(**raw.get("metrics", {})),
        sentiment=PersonSentiment(**raw.get("sentiment", {})),
        dead_man_switch=raw.get("dead_man_switch", {}),
        waste=raw.get("waste", {}),
        connections=[ConnectionDetail(**c) for c in raw.get("connections", [])],
    )
