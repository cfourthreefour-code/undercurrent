"""People list + detail endpoints."""

import hashlib
import json
from pathlib import Path

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

_graph_data: dict | None = None
_metrics_data: dict | None = None
_people_dir: Path | None = None
_community_labels: dict[int, str] = {}
_role_snapshots: dict[str, str] = {}


def init(
    graph_data: dict,
    metrics_data: dict,
    people_dir: Path,
    communities_data: dict | None = None,
    role_snapshots: dict[str, str] | None = None,
):
    global _graph_data, _metrics_data, _people_dir, _community_labels, _role_snapshots
    _graph_data = graph_data
    _metrics_data = metrics_data
    _people_dir = people_dir
    if communities_data:
        for c in communities_data.get("communities", []):
            if "label" in c:
                _community_labels[c["id"]] = c["label"]
    if role_snapshots:
        _role_snapshots = role_snapshots


@router.get("", response_model=PeopleListResponse)
def get_people():
    """All people with summary metrics (sortable)."""
    # Build DMS and waste lookup
    dms_map = {d["id"]: d.get("dms_score", 0) for d in _metrics_data.get("dead_man_switch", [])}
    waste_map = {w["id"]: w.get("waste_score", 0) for w in _metrics_data.get("waste", [])}

    # Build first_seen lookup from edges
    first_seen_map: dict[str, str] = {}
    for e in _graph_data.get("edges", []):
        fe = e.get("first_email")
        if not fe:
            continue
        for pid in (e["source"], e["target"]):
            if pid not in first_seen_map or fe < first_seen_map[pid]:
                first_seen_map[pid] = fe

    people = []
    for n in _graph_data["nodes"]:
        fs = first_seen_map.get(n["id"])
        # Format as "Jan 2000" style
        first_seen = None
        if fs:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(fs.replace("Z", "+00:00"))
                first_seen = dt.strftime("%b %Y")
            except Exception:
                first_seen = fs[:10] if len(fs) >= 10 else fs

        people.append(PersonSummary(
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
            dms_score=dms_map.get(n["id"], 0),
            waste_score=waste_map.get(n["id"], 0),
            first_seen=first_seen,
        ))

    return PeopleListResponse(people=people)


def _seed(node_id: str, salt: str = "") -> float:
    """Deterministic pseudo-random float from node id."""
    h = int(hashlib.md5((node_id + salt).encode()).hexdigest()[:8], 16)
    return (h % 1000) / 1000.0


def _bin_label(value: float, thresholds: tuple = (0.33, 0.66)) -> str:
    if value < thresholds[0]:
        return "Low"
    if value < thresholds[1]:
        return "Medium"
    return "High"


@router.get("/{person_id:path}/panel", response_model=PersonPanelResponse)
def get_person_panel(person_id: str):
    """Rich panel data for a person (real + mock fields)."""
    # Find the node
    node = None
    for n in _graph_data["nodes"]:
        if n["id"] == person_id:
            node = n
            break
    if not node:
        raise HTTPException(status_code=404, detail=f"Person '{person_id}' not found")

    # Build lookups
    dms_map = {d["id"]: d for d in _metrics_data.get("dead_man_switch", [])}
    dms = dms_map.get(person_id, {})
    dms_score = dms.get("dms_score", 0)

    # All DMS scores for percentile
    all_dms = sorted([d.get("dms_score", 0) for d in _metrics_data.get("dead_man_switch", [])], reverse=True)
    if all_dms:
        rank_in_dms = next((i for i, s in enumerate(all_dms) if s <= dms_score), len(all_dms))
        percentile = rank_in_dms / len(all_dms)
    else:
        percentile = 1.0

    # Alert tier
    if percentile < 0.10:
        alert_tier = "critical"
    elif percentile < 0.30:
        alert_tier = "warning"
    else:
        alert_tier = "healthy"

    # First email from edges
    first_email = None
    for e in _graph_data.get("edges", []):
        if e["source"] == person_id or e["target"] == person_id:
            fe = e.get("first_email")
            if fe and (first_email is None or fe < first_email):
                first_email = fe

    # Communication health — use actual edge email_count sums
    out_email_count = 0
    in_email_count = 0
    edge_first_dates: list[str] = []
    edge_last_dates: list[str] = []
    for e in _graph_data.get("edges", []):
        if e["source"] == person_id:
            out_email_count += e.get("email_count", 0)
        if e["target"] == person_id:
            in_email_count += e.get("email_count", 0)
        if e["source"] == person_id or e["target"] == person_id:
            if e.get("first_email"):
                edge_first_dates.append(e["first_email"])
            if e.get("last_email"):
                edge_last_dates.append(e["last_email"])

    total_sent = out_email_count if out_email_count > 0 else node.get("total_sent", 0)
    total_received = in_email_count if in_email_count > 0 else node.get("total_received", 0)
    total = total_sent + total_received
    in_pct = round((total_received / total) * 100, 1) if total > 0 else 50.0
    out_pct = round(100 - in_pct, 1)

    # Compute actual date range for emails_per_day
    if edge_first_dates and edge_last_dates:
        try:
            from datetime import datetime as _dt
            d1 = _dt.fromisoformat(min(edge_first_dates).replace("Z", "+00:00"))
            d2 = _dt.fromisoformat(max(edge_last_dates).replace("Z", "+00:00"))
            days_span = max((d2 - d1).days, 1)
        except Exception:
            days_span = 730
    else:
        days_span = 730

    s = _seed(person_id)
    emails_per_day = round(total_sent / days_span, 1)
    median_response_time = round(1 + s * 7, 1)  # 1-8 hrs

    if total > 5000:
        after_hours = "High"
    elif total > 1000:
        after_hours = "Med"
    else:
        after_hours = "Low"

    betweenness = node.get("betweenness", 0)

    # Influence & Flow — normalize degree to 0-1 range
    in_deg = node.get("in_degree_centrality", 0)
    out_deg = node.get("out_degree_centrality", 0)
    all_in = [n2.get("in_degree_centrality", 0) for n2 in _graph_data["nodes"]]
    all_out = [n2.get("out_degree_centrality", 0) for n2 in _graph_data["nodes"]]
    max_in = max(all_in) if all_in else 1
    max_out = max(all_out) if all_out else 1
    in_degree_norm = round(in_deg / max_in, 4) if max_in > 0 else 0
    out_degree_norm = round(out_deg / max_out, 4) if max_out > 0 else 0

    # Role snapshot — use pre-computed email-inferred snapshot if available
    community_id = node.get("community_id", 0)
    community_label = _community_labels.get(community_id, f"Community {community_id}")
    if person_id in _role_snapshots:
        role_snapshot = _role_snapshots[person_id]
    else:
        centrality_rank_label = "high" if betweenness > 0.01 else "moderate" if betweenness > 0.001 else "low"
        role_snapshot = (
            f"Member of {community_label} with {centrality_rank_label} centrality. "
            f"Sends {total_sent} and receives {total_received} emails. "
            f"Acts as a {'key connector' if betweenness > 0.005 else 'regular participant'} in the network."
        )

    # Workstreams (mock)
    ws_labels = ["Operations", "Strategy", "Compliance", "Client Relations",
                 "Risk Mgmt", "Finance", "HR", "IT"]
    s2 = _seed(person_id, "ws")
    n_ws = 3 + int(s2 * 2)  # 3-4 workstreams
    raw = [int(10 + _seed(person_id, f"ws{i}") * 90) for i in range(n_ws)]
    total_raw = sum(raw)
    workstreams = [
        Workstream(label=ws_labels[(community_id * 2 + i) % len(ws_labels)],
                   percent=round(r / total_raw * 100))
        for i, r in enumerate(raw)
    ]

    # Recent changes (mock heuristic)
    vol_delta = round((_seed(person_id, "vol") - 0.5) * 30, 1)
    div_delta = round((_seed(person_id, "div") - 0.5) * 20, 1)
    new_topic = "Restructuring Initiative" if _seed(person_id, "topic") > 0.7 else None

    # Peer comparison
    community_members = [n2 for n2 in _graph_data["nodes"] if n2.get("community_id") == community_id]
    community_members.sort(key=lambda x: x.get("betweenness", 0), reverse=True)
    peer_rank = next((i + 1 for i, m in enumerate(community_members) if m["id"] == person_id), 0)

    # Likely backups: same community, similar betweenness
    backups = []
    for m in community_members:
        if m["id"] != person_id and abs(m.get("betweenness", 0) - betweenness) < betweenness * 0.5:
            backups.append(m["name"])
            if len(backups) >= 3:
                break

    # Comparable peers: direct neighbors ranked by similarity
    node_map = {n2["id"]: n2 for n2 in _graph_data["nodes"]}
    neighbor_ids: set[str] = set()
    for e in _graph_data.get("edges", []):
        if e["source"] == person_id and e["target"] in node_map:
            neighbor_ids.add(e["target"])
        elif e["target"] == person_id and e["source"] in node_map:
            neighbor_ids.add(e["source"])

    comparable = []
    for nid in neighbor_ids:
        nb = node_map[nid]
        # Similarity: inverse of Euclidean distance on key metrics
        diff_b = abs(nb.get("betweenness", 0) - betweenness)
        diff_p = abs(nb.get("pagerank", 0) - node.get("pagerank", 0))
        diff_d = abs(nb.get("degree_centrality", 0) - node.get("degree_centrality", 0))
        dist = (diff_b ** 2 + diff_p ** 2 + diff_d ** 2) ** 0.5
        similarity = round(1.0 / (1.0 + dist * 1000), 3)
        comparable.append(PeerComparison(
            name=nb["name"],
            betweenness=round(nb.get("betweenness", 0), 6),
            pagerank=round(nb.get("pagerank", 0), 6),
            total_sent=nb.get("total_sent", 0),
            total_received=nb.get("total_received", 0),
            similarity_score=similarity,
        ))
    comparable.sort(key=lambda p: p.similarity_score, reverse=True)

    return PersonPanelResponse(
        id=person_id,
        name=node["name"],
        email=node["email"],
        community_id=community_id,
        alert_tier=alert_tier,
        since=first_email[:10] if first_email else None,
        role_snapshot=role_snapshot,
        workstreams=workstreams,
        emails_per_day=emails_per_day,
        in_pct=in_pct,
        out_pct=out_pct,
        median_response_time_hrs=median_response_time,
        after_hours_activity=after_hours,
        in_degree_norm=in_degree_norm,
        out_degree_norm=out_degree_norm,
        response_latency=_bin_label(_seed(person_id, "latency")),
        volume_delta_pct=vol_delta,
        new_topic=new_topic,
        diversity_delta_pct=div_delta,
        peer_rank=peer_rank,
        peer_total=len(community_members),
        likely_backups=backups,
        comparable_peers=comparable[:5],
    )


@router.get("/{person_id:path}", response_model=PersonDetailResponse)
def get_person(person_id: str):
    """Full person profile."""
    # Try to load from people directory
    safe_name = person_id.replace("@", "_at_").replace(".", "_").replace("/", "_")
    person_file = _people_dir / f"{safe_name}.json"

    if not person_file.exists():
        raise HTTPException(status_code=404, detail=f"Person '{person_id}' not found")

    with open(person_file) as f:
        data = json.load(f)

    return PersonDetailResponse(
        id=data["id"],
        name=data["name"],
        email=data["email"],
        community_id=data.get("community_id"),
        metrics=PersonMetrics(**data.get("metrics", {})),
        sentiment=PersonSentiment(**data.get("sentiment", {})),
        dead_man_switch=data.get("dead_man_switch", {}),
        waste=data.get("waste", {}),
        connections=[ConnectionDetail(**c) for c in data.get("connections", [])],
    )
