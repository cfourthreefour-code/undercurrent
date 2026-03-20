"""Graph data endpoints."""

from fastapi import APIRouter, HTTPException

from src.api.schemas import EdgeResponse, GraphResponse, NodeDetailResponse, NodeResponse

router = APIRouter(prefix="/api/graph", tags=["graph"])

_data: dict | None = None
_comm_labels: dict[int, str] = {}


def init(graph_data: dict, comms: dict | None = None):
    global _data, _comm_labels
    _data = graph_data
    if comms:
        for c in comms.get("communities", []):
            if "label" in c:
                _comm_labels[c["id"]] = c["label"]


@router.get("", response_model=GraphResponse)
def get_graph():
    """Full graph for visualization."""
    return GraphResponse(
        nodes=[NodeResponse(**n) for n in _data["nodes"]],
        edges=[EdgeResponse(**e) for e in _data["edges"]],
        community_names=_comm_labels,
    )


@router.get("/node/{node_id:path}", response_model=NodeDetailResponse)
def get_node(node_id: str):
    """Single node with metrics + connections."""
    node = next((n for n in _data["nodes"] if n["id"] == node_id), None)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    conns = [
        EdgeResponse(**e)
        for e in _data["edges"]
        if e["source"] == node_id or e["target"] == node_id
    ]

    return NodeDetailResponse(node=NodeResponse(**node), connections=conns)
