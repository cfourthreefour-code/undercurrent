"""Centrality metrics for communication graphs."""

import networkx as nx


def compute_centrality(graph: nx.DiGraph) -> dict[str, dict[str, float]]:
    """Compute centrality measures for all nodes.

    Returns {node_id: {metric: value}}
    """
    # init empty scores for each node
    scores: dict[str, dict[str, float]] = {node: {} for node in graph.nodes()}

    # degree centrality (in + out)
    in_deg = nx.in_degree_centrality(graph)
    out_deg = nx.out_degree_centrality(graph)

    for node in graph.nodes():
        scores[node]["in_degree_centrality"] = in_deg.get(node, 0)
        scores[node]["out_degree_centrality"] = out_deg.get(node, 0)
        scores[node]["degree_centrality"] = in_deg.get(node, 0) + out_deg.get(node, 0)

    # betweenness - who sits on shortest paths
    betw = nx.betweenness_centrality(graph, weight="weight", normalized=True)
    for node in graph.nodes():
        scores[node]["betweenness_centrality"] = betw.get(node, 0)

    # eigenvector - connected to important people
    # use undirected version for better convergence
    undirected = graph.to_undirected()
    try:
        eigen = nx.eigenvector_centrality(undirected, max_iter=1000, weight="weight")
    except nx.PowerIterationFailedConvergence:
        # fall back to numpy solver
        eigen = nx.eigenvector_centrality_numpy(undirected, weight="weight")

    for node in graph.nodes():
        scores[node]["eigenvector_centrality"] = eigen.get(node, 0)

    # pagerank
    pr = nx.pagerank(graph, weight="weight")
    for node in graph.nodes():
        scores[node]["pagerank"] = pr.get(node, 0)

    return scores
