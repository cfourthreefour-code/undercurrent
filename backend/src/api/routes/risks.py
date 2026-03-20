"""Risks endpoint — org risk analysis."""

from fastapi import APIRouter

from src.api.schemas import HighRiskNode, RisksResponse, StructuralRisk, WasteOffender

router = APIRouter(prefix="/api/risks", tags=["risks"])

_graph: dict | None = None
_metrics: dict | None = None


def init(graph_data: dict, metrics_data: dict):
    global _graph, _metrics
    _graph = graph_data
    _metrics = metrics_data


@router.get("", response_model=RisksResponse)
def get_risks():
    """Organizational risk assessment."""
    dms_list = _metrics.get("dead_man_switch", [])
    waste_list = _metrics.get("waste", [])
    health = _metrics.get("health", {})
    stats = health.get("stats", {})

    # high-risk nodes from top DMS
    high_risk = []
    for d in dms_list[:10]:
        score = d.get("dms_score", 0)
        if score > 0.3:
            label = "Critical"
        elif score > 0.15:
            label = "High"
        elif score > 0.05:
            label = "Moderate"
        else:
            label = "Low"

        betw = d.get("betweenness", 0)
        eigen = d.get("eigenvector", 0)
        vuln = "High betweenness — key information broker" if betw > eigen else \
               "High eigenvector — connected to other influential nodes"

        high_risk.append(HighRiskNode(
            id=d["id"],
            name=d["name"],
            risk_score=score,
            risk_label=label,
            key_vulnerability=vuln,
            impact_pct=d.get("impact_pct", 0),
        ))

    # structural risks
    structural = []

    # fragmentation
    max_impact = dms_list[0].get("impact_pct", 0) if dms_list else 0
    sev = "Critical" if max_impact > 5 else "High" if max_impact > 2 else "Medium"
    structural.append(StructuralRisk(
        label="Fragmentation Sensitivity",
        description=f"Removing the most critical node fragments {max_impact}% of the network",
        severity=sev,
        value=max_impact,
    ))

    # betweenness inequality
    nodes = _graph["nodes"]
    betw_vals = sorted([n.get("betweenness", 0) for n in nodes], reverse=True)
    if betw_vals and len(betw_vals) > 1:
        top10 = max(1, len(betw_vals) // 10)
        share = sum(betw_vals[:top10]) / max(sum(betw_vals), 0.001)
    else:
        share = 0
    structural.append(StructuralRisk(
        label="Betweenness Inequality",
        description=f"Top 10% of nodes hold {share * 100:.0f}% of total betweenness centrality",
        severity="Critical" if share > 0.7 else "High" if share > 0.5 else "Medium",
        value=round(share * 100, 1),
    ))

    # avg path length
    avg_path = stats.get("avg_path_length")
    if avg_path:
        structural.append(StructuralRisk(
            label="Average Path Length",
            description=f"Information travels {avg_path:.2f} hops on average between people",
            severity="High" if avg_path > 4 else "Medium" if avg_path > 3 else "Low",
            value=round(avg_path, 2),
        ))

    # communication waste
    comm_waste = [
        WasteOffender(
            id=w["id"],
            name=w["name"],
            waste_score=w.get("waste_score", 0),
            overproduction=w.get("overproduction", 0),
            reply_all_ratio=w.get("reply_all_ratio", 0),
            response_gap=w.get("orphan_ratio", 0),
        )
        for w in waste_list[:10]
    ]

    return RisksResponse(
        high_risk_nodes=high_risk,
        structural_risks=structural,
        communication_waste=comm_waste,
    )
