"""What-if departure simulator — remove a node, see what breaks."""

import math
import random
from collections import defaultdict

import community as community_louvain
import networkx as nx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/simulate", tags=["simulator"])

# module state — populated at startup by init()
_graph: nx.DiGraph | None = None
_graph_data: dict | None = None
_comms_data: dict | None = None
_metrics_data: dict | None = None

# pre-built lookups (avoid re-scanning lists per request)
_betw_lookup: dict[str, float] = {}      # node_id -> pre-computed betweenness
_old_partition: dict[str, int] = {}      # node_id -> community_id
_old_labels: dict[int, str] = {}         # community_id -> label
_old_comms: dict[int, dict] = {}         # community_id -> full community dict


def init(graph_data: dict, comms_data: dict, metrics_data: dict):
    global _graph, _graph_data, _comms_data, _metrics_data
    global _betw_lookup, _old_partition, _old_labels, _old_comms

    _graph_data = graph_data
    _comms_data = comms_data
    _metrics_data = metrics_data

    # precompute lookups
    _betw_lookup = {n["id"]: n.get("betweenness", 0.0) for n in graph_data.get("nodes", [])}

    for c in comms_data.get("communities", []):
        cid = c["id"]
        _old_comms[cid] = c
        _old_labels[cid] = c.get("label", f"Group {cid}")
        for m in c.get("members", []):
            _old_partition[m] = cid

    # rebuild DiGraph from graph.json — one-time O(n+m) at startup
    _graph = _rebuild_graph(graph_data)


def _rebuild_graph(data: dict) -> nx.DiGraph:
    g = nx.DiGraph()
    for n in data.get("nodes", []):
        g.add_node(
            n["id"],
            name=n.get("name", ""),
            email=n.get("email", ""),
            total_sent=n.get("total_sent", 0),
            total_received=n.get("total_received", 0),
        )
    for e in data.get("edges", []):
        g.add_edge(
            e["source"], e["target"],
            weight=e.get("weight", 1.0),
            email_count=e.get("email_count", 1),
            sentiment=e.get("sentiment", 0.5),
        )
    return g


def _health_snapshot(g: nx.DiGraph, partition: dict, betw: dict[str, float]) -> dict:
    """Compute health sub-scores using pre-computed betweenness (no redundant betw call)."""
    n_nodes = g.number_of_nodes()
    n_edges = g.number_of_edges()

    if n_nodes < 2:
        return {
            "health_score": 0, "grade": "F",
            "sub_scores": {"connectivity": 0, "bottleneck_risk": 100, "silo_score": 100, "efficiency": 0},
            "node_count": n_nodes, "edge_count": n_edges,
            "community_count": len(set(partition.values())) if partition else 0,
        }

    # --- connectivity (matches health.py formula) ---
    density = nx.density(g)
    giant_cc = max(nx.weakly_connected_components(g), key=len)
    gcc_pct = len(giant_cc) / n_nodes
    dens_score = min(1.0, math.log10(density * 100 + 1) / 2) if density > 0 else 0
    connectivity = 0.4 * dens_score + 0.6 * gcc_pct

    # --- bottleneck risk (uses passed-in betw) ---
    max_betw = max(betw.values()) if betw else 0
    vals = sorted(betw.values())
    nn = len(vals)
    s = sum(vals)
    gini = sum((2 * (i + 1) - nn - 1) * v for i, v in enumerate(vals)) / (nn * s) if nn > 0 and s > 0 else 0
    bottleneck_risk = 0.5 * max_betw + 0.5 * gini

    # --- silo score ---
    if partition:
        intra = inter = 0
        for src, tgt in g.edges():
            if partition.get(src) == partition.get(tgt):
                intra += 1
            else:
                inter += 1
        total = intra + inter
        silo_score = 1 - (inter / total) if total > 0 else 1
    else:
        silo_score = 0.5

    # --- efficiency — sample 50 BFS instead of full all-pairs (too slow on 4500 nodes) ---
    undirected = g.to_undirected()
    gcc_sg = undirected.subgraph(giant_cc)
    clustering = nx.average_clustering(undirected)

    gcc_nodes = list(gcc_sg)
    sources = random.sample(gcc_nodes, min(50, len(gcc_nodes)))
    total_len = pair_count = 0
    for src in sources:
        lengths = nx.single_source_shortest_path_length(gcc_sg, src)
        for v in lengths.values():
            if v > 0:
                total_len += v
                pair_count += 1

    avg_path = total_len / pair_count if pair_count > 0 else 4.0
    path_score = max(0.0, 1 - (avg_path - 2) / 8)
    efficiency = 0.6 * path_score + 0.4 * clustering

    # --- combine ---
    raw = 0.25 * connectivity + 0.25 * (1 - bottleneck_risk) + 0.25 * (1 - silo_score) + 0.25 * efficiency
    health_score = max(0, min(100, round(raw * 100, 1)))

    if health_score >= 90: grade = "A"
    elif health_score >= 80: grade = "B"
    elif health_score >= 65: grade = "C"
    elif health_score >= 50: grade = "D"
    else: grade = "F"

    return {
        "health_score": health_score,
        "grade": grade,
        "sub_scores": {
            "connectivity": round(connectivity * 100, 1),
            "bottleneck_risk": round(bottleneck_risk * 100, 1),
            "silo_score": round(silo_score * 100, 1),
            "efficiency": round(efficiency * 100, 1),
        },
        "node_count": n_nodes,
        "edge_count": n_edges,
        "community_count": len(set(partition.values())) if partition else 0,
    }


def _affected_communities(node_id: str, reduced: nx.DiGraph, new_partition: dict) -> list[dict]:
    """Find communities whose membership changed due to the removal."""
    if node_id not in _old_partition:
        return []

    old_cid = _old_partition[node_id]
    comm = _old_comms.get(old_cid, {})
    members = comm.get("members", [])

    # survivors: members still in the reduced graph
    survivors = [m for m in members if m in reduced]
    if not survivors and not members:
        return []

    return [{
        "id": old_cid,
        "label": _old_labels.get(old_cid, f"Group {old_cid}"),
        "size_before": len(members),
        "size_after": len(survivors),
    }]


@router.get("/{node_id:path}")
def simulate_departure(node_id: str):
    """Simulate removal of a person and return before/after org health metrics."""
    if _graph is None:
        raise HTTPException(status_code=503, detail="Simulator not initialized")
    if node_id not in _graph:
        raise HTTPException(status_code=404, detail=f"Node not found: {node_id!r}")

    node_name = _graph.nodes[node_id].get("name", node_id)

    # --- before: from pre-computed data, no recalculation needed ---
    h = _metrics_data.get("health", {})
    before = {
        "health_score": h.get("health_score", 0),
        "grade": h.get("grade", "F"),
        "sub_scores": h.get("sub_scores", {}),
        "node_count": h.get("stats", {}).get("node_count", _graph.number_of_nodes()),
        "edge_count": h.get("stats", {}).get("edge_count", _graph.number_of_edges()),
        "community_count": len(_comms_data.get("communities", [])),
    }

    edges_lost = _graph.in_degree(node_id) + _graph.out_degree(node_id)

    # --- build reduced graph ---
    reduced = _graph.copy()
    reduced.remove_node(node_id)

    # orphaned = nodes that become completely isolated after removal
    orphaned = [
        {"id": nid, "name": reduced.nodes[nid].get("name", nid)}
        for nid in reduced.nodes()
        if reduced.degree(nid) == 0
    ]

    # compute betweenness once — used for both health snapshot and bottleneck detection
    k = min(200, len(reduced))
    after_betw = nx.betweenness_centrality(reduced, k=k, normalized=True)

    # run Louvain once — used for silo score and community analysis
    after_partition = community_louvain.best_partition(reduced.to_undirected(), weight="weight")

    # compute after health (reuses the betweenness we already computed)
    after_snap = _health_snapshot(reduced, after_partition, after_betw)

    # --- new bottlenecks: nodes whose betweenness increased most ---
    bottleneck_candidates = []
    for nid, new_bval in after_betw.items():
        old_bval = _betw_lookup.get(nid, 0.0)
        if new_bval > old_bval:
            bottleneck_candidates.append({
                "id": nid,
                "name": reduced.nodes[nid].get("name", nid),
                "betweenness_before": round(old_bval, 5),
                "betweenness_after": round(new_bval, 5),
            })

    bottleneck_candidates.sort(key=lambda x: x["betweenness_after"] - x["betweenness_before"], reverse=True)
    new_bottlenecks = bottleneck_candidates[:5]

    # --- fragmentation ---
    components = list(nx.weakly_connected_components(reduced))

    return {
        "node_id": node_id,
        "node_name": node_name,
        "before": before,
        "after": after_snap,
        "impact": {
            "health_delta": round(after_snap["health_score"] - before["health_score"], 1),
            "edges_lost": edges_lost,
            "orphaned_nodes": orphaned,
            "fragmented": len(components) > 1,
            "components": len(components),
            "affected_communities": _affected_communities(node_id, reduced, after_partition),
            "new_bottlenecks": new_bottlenecks,
        },
    }
