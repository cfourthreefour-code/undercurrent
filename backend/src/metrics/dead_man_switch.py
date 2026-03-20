"""Dead-Man-Switch scoring - who's critical to the org?"""

import networkx as nx


def compute_dead_man_switch(
    graph: nx.DiGraph,
    w_betweenness: float = 0.4,
    w_eigenvector: float = 0.3,
    w_redundancy: float = 0.3,
) -> list[dict]:
    """Rank how critical each person is.

    DMS(v) = w1·norm(betweenness) + w2·norm(eigenvector) - w3·norm(redundancy)

    Higher score = more damage if they leave.
    """
    if graph.number_of_nodes() == 0:
        return []

    # centrality measures
    betw = nx.betweenness_centrality(graph, normalized=True)

    undirected = graph.to_undirected()
    try:
        eigen = nx.eigenvector_centrality(undirected, max_iter=1000, weight="weight")
    except (nx.PowerIterationFailedConvergence, nx.NetworkXError):
        # numpy fallback
        try:
            eigen = nx.eigenvector_centrality_numpy(undirected, weight="weight")
        except Exception:
            eigen = {n: 0.0 for n in graph.nodes()}

    n_nodes = graph.number_of_nodes()

    # normalize to 0-1
    max_betw = max(betw.values()) if betw else 1
    max_eigen = max(eigen.values()) if eigen else 1

    results = []

    for node in graph.nodes():
        norm_b = betw.get(node, 0) / max_betw if max_betw > 0 else 0
        norm_e = eigen.get(node, 0) / max_eigen if max_eigen > 0 else 0

        # redundancy: how much of graph stays connected without this person?
        without_node = graph.copy()
        without_node.remove_node(node)

        if without_node.number_of_nodes() > 0:
            largest_cc = max(nx.weakly_connected_components(without_node), key=len)
            reachable = len(largest_cc) / (n_nodes - 1)
        else:
            reachable = 0

        redundancy = reachable  # high = org survives fine without them
        impact = round((1 - reachable) * 100, 1)

        dms = (
            w_betweenness * norm_b
            + w_eigenvector * norm_e
            - w_redundancy * redundancy
        )

        results.append({
            "id": node,
            "name": graph.nodes[node].get("name", node),
            "dms_score": round(dms, 4),
            "betweenness": round(betw.get(node, 0), 6),
            "eigenvector": round(eigen.get(node, 0), 6),
            "redundancy": round(redundancy, 4),
            "impact_pct": impact,
        })

    results.sort(key=lambda x: x["dms_score"], reverse=True)
    return results
