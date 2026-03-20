"""Metrics & analytics endpoints."""

from fastapi import APIRouter, Query

from src.api.schemas import (
    CentralityEntry,
    CentralityResponse,
    CommunitiesResponse,
    CommunityResponse,
    DMSEntry,
    DMSResponse,
    WasteEntry,
    WasteResponse,
)

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

_metrics: dict | None = None
_comms: dict | None = None
_graph: dict | None = None


def init(metrics_data: dict, comms: dict, graph_data: dict):
    global _metrics, _comms, _graph
    _metrics = metrics_data
    _comms = comms
    _graph = graph_data


@router.get("/overview")
def get_overview():
    """Dashboard summary — health + sentiment."""
    return {
        "health": _metrics["health"],
        "sentiment": _metrics["sentiment"],
    }


@router.get("/centrality", response_model=CentralityResponse)
def get_centrality(type: str = Query("pagerank", enum=["pagerank", "betweenness", "eigenvector", "degree"])):
    """Centrality rankings by type."""
    # check if pre-computed
    if type in _metrics.get("top_centrality", {}):
        ranks = _metrics["top_centrality"][type]
    else:
        # build from graph nodes
        fld = {"pagerank": "pagerank", "betweenness": "betweenness",
               "eigenvector": "eigenvector", "degree": "degree_centrality"}.get(type, "pagerank")
        ranks = sorted(
            [{"id": n["id"], "name": n["name"], "score": n.get(fld, 0)} for n in _graph["nodes"]],
            key=lambda x: x["score"],
            reverse=True,
        )[:50]

    return CentralityResponse(type=type, rankings=[CentralityEntry(**r) for r in ranks])


@router.get("/communities", response_model=CommunitiesResponse)
def get_communities():
    """Community data."""
    return CommunitiesResponse(
        communities=[CommunityResponse(**c) for c in _comms["communities"]],
        bridge_nodes=_comms.get("bridge_nodes", []),
        modularity=_comms.get("modularity", 0),
    )


@router.get("/dead-man-switch", response_model=DMSResponse)
def get_dead_man_switch():
    """Critical people ranked."""
    return DMSResponse(rankings=[DMSEntry(**d) for d in _metrics["dead_man_switch"]])


@router.get("/waste", response_model=WasteResponse)
def get_waste():
    """Waste analysis per person."""
    return WasteResponse(people=[WasteEntry(**w) for w in _metrics["waste"]])
