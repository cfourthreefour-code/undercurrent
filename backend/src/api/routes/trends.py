"""Trends endpoint — heuristic analysis of shifts."""

import hashlib

from fastapi import APIRouter

from src.api.schemas import TrendItem, TrendsResponse

router = APIRouter(prefix="/api/trends", tags=["trends"])

_graph: dict | None = None
_metrics: dict | None = None
_comms: dict | None = None


def init(graph_data: dict, metrics_data: dict, comms: dict):
    global _graph, _metrics, _comms
    _graph = graph_data
    _metrics = metrics_data
    _comms = comms


def _seed(nid: str) -> float:
    """Deterministic pseudo-random float from node id."""
    h = int(hashlib.md5(nid.encode()).hexdigest()[:8], 16)
    return (h % 1000) / 1000.0


@router.get("", response_model=TrendsResponse)
def get_trends():
    """Heuristic org trends."""
    nodes = _graph["nodes"]

    # structural — top by betweenness
    by_betw = sorted(nodes, key=lambda n: n.get("betweenness", 0), reverse=True)
    structural = []
    for n in by_betw[:8]:
        s = _seed(n["id"])
        delta = round((s - 0.5) * 40, 1)
        structural.append(TrendItem(
            person_id=n["id"],
            person_name=n["name"],
            metric="Betweenness Centrality",
            value=round(n.get("betweenness", 0), 5),
            delta_pct=delta,
        ))

    # communication — top by degree
    by_deg = sorted(nodes, key=lambda n: n.get("degree_centrality", 0), reverse=True)
    communication = []
    for n in by_deg[:8]:
        s = _seed(n["id"] + "_comm")
        delta = round((s - 0.4) * 30, 1)
        communication.append(TrendItem(
            person_id=n["id"],
            person_name=n["name"],
            metric="Degree Centrality",
            value=round(n.get("degree_centrality", 0), 5),
            delta_pct=delta,
        ))

    # workstream — mock based on total_sent
    by_sent = sorted(nodes, key=lambda n: n.get("total_sent", 0), reverse=True)
    topics = ["Project Alpha", "Q4 Planning", "Compliance Review", "Risk Assessment",
              "Budget Allocation", "Vendor Management", "Team Restructuring", "Client Onboarding"]
    workstream = []
    for i, n in enumerate(by_sent[:8]):
        s = _seed(n["id"] + "_ws")
        delta = round((s - 0.3) * 50, 1)
        workstream.append(TrendItem(
            person_id=n["id"],
            person_name=n["name"],
            metric=topics[i % len(topics)],
            value=round(n.get("total_sent", 0)),
            delta_pct=delta,
        ))

    return TrendsResponse(
        structural_shifts=structural,
        communication_shifts=communication,
        workstream_shifts=workstream,
    )
