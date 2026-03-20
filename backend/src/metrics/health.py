"""Aggregate org health scoring."""

import math

import networkx as nx


def compute_health(
    graph: nx.DiGraph,
    communities: dict,
    w_connectivity: float = 0.25,
    w_bottleneck: float = 0.25,
    w_silo: float = 0.25,
    w_efficiency: float = 0.25,
) -> dict:
    """Compute overall org health score (0-100) with letter grade.

    health = w1·connectivity + w2·(1-bottleneck) + w3·(1-silo) + w4·efficiency
    """
    num_nodes = graph.number_of_nodes()
    num_edges = graph.number_of_edges()

    if num_nodes < 2:
        return {
            "health_score": 0,
            "grade": "F",
            "sub_scores": {
                "connectivity": 0, "bottleneck_risk": 1,
                "silo_score": 1, "efficiency": 0,
            },
            "stats": {"node_count": num_nodes, "edge_count": num_edges},
        }

    # -- connectivity --
    density = nx.density(graph)
    giant_cc = max(nx.weakly_connected_components(graph), key=len)
    gcc_pct = len(giant_cc) / num_nodes

    # log scale for density (it's tiny in large graphs)
    dens_score = min(1.0, (math.log10(density * 100 + 1) / 2)) if density > 0 else 0
    connectivity = 0.4 * dens_score + 0.6 * gcc_pct

    # -- bottleneck risk --
    betw = nx.betweenness_centrality(graph, normalized=True)
    max_betw = max(betw.values()) if betw else 0

    # gini coefficient of betweenness
    vals = sorted(betw.values())
    n = len(vals)
    if n > 0 and sum(vals) > 0:
        gini = sum((2 * (i + 1) - n - 1) * v for i, v in enumerate(vals)) / (n * sum(vals))
    else:
        gini = 0

    bottleneck_risk = 0.5 * max_betw + 0.5 * gini

    # -- silo score --
    partition = communities.get("partition", {})
    if partition:
        intra = 0
        inter = 0
        for src, tgt in graph.edges():
            if partition.get(src) == partition.get(tgt):
                intra += 1
            else:
                inter += 1
        total = intra + inter
        silo_score = 1 - (inter / total) if total > 0 else 1
    else:
        silo_score = 0.5

    # -- efficiency --
    undirected = graph.to_undirected()
    gcc_sg = undirected.subgraph(giant_cc)

    try:
        avg_path = nx.average_shortest_path_length(gcc_sg)
        path_score = max(0, 1 - (avg_path - 2) / 8)
    except nx.NetworkXError:
        avg_path = None
        path_score = 0.5

    clustering = nx.average_clustering(undirected)
    efficiency = 0.6 * path_score + 0.4 * clustering

    # -- combine --
    raw = (
        w_connectivity * connectivity
        + w_bottleneck * (1 - bottleneck_risk)
        + w_silo * (1 - silo_score)
        + w_efficiency * efficiency
    )
    health_score = max(0, min(100, round(raw * 100, 1)))

    # letter grade
    if health_score >= 90:
        grade = "A"
    elif health_score >= 80:
        grade = "B"
    elif health_score >= 65:
        grade = "C"
    elif health_score >= 50:
        grade = "D"
    else:
        grade = "F"

    return {
        "health_score": health_score,
        "grade": grade,
        "sub_scores": {
            "connectivity": round(connectivity * 100, 1),
            "bottleneck_risk": round(bottleneck_risk * 100, 1),
            "silo_score": round(silo_score * 100, 1),
            "efficiency": round(efficiency * 100, 1),
        },
        "stats": {
            "node_count": num_nodes,
            "edge_count": num_edges,
            "density": round(density, 6),
            "avg_path_length": round(avg_path, 2) if avg_path else None,
            "clustering_coefficient": round(clustering, 4),
            "communities_count": len(communities.get("communities", [])),
            "modularity": communities.get("modularity", 0),
            "gcc_ratio": round(gcc_pct, 4),
        },
    }
