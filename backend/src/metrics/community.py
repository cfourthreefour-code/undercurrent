"""Community detection via Louvain."""

from collections import defaultdict

import community as community_louvain  # python-louvain
import networkx as nx


def detect_communities(graph: nx.DiGraph) -> dict:
    """Run Louvain community detection on undirected projection.

    Returns partition, community list, bridge nodes, modularity, labels.
    """
    undirected = graph.to_undirected()

    # louvain does the heavy lifting
    partition = community_louvain.best_partition(undirected, weight="weight")
    modularity = community_louvain.modularity(partition, undirected, weight="weight")

    # group nodes by their community
    members_by_comm: dict[int, list[str]] = defaultdict(list)
    for node, cid in partition.items():
        members_by_comm[cid].append(node)

    # build community stats
    communities = []
    for cid, members in sorted(members_by_comm.items()):
        sg = undirected.subgraph(members)
        n = len(members)
        possible = n * (n - 1) / 2 if n > 1 else 1
        dens = sg.number_of_edges() / possible if possible > 0 else 0

        communities.append({
            "id": cid,
            "members": members,
            "size": n,
            "density": round(dens, 4),
        })

    # find bridge nodes - high betweenness AND connected to multiple communities
    betw = nx.betweenness_centrality(graph, normalized=True)
    median_betw = sorted(betw.values())[len(betw) // 2] if betw else 0

    bridges = []
    for node in graph.nodes():
        if betw.get(node, 0) < median_betw:
            continue

        # which communities do neighbors belong to?
        neighbor_comms = set()
        for nbr in set(graph.predecessors(node)) | set(graph.successors(node)):
            if nbr in partition:
                neighbor_comms.add(partition[nbr])

        if len(neighbor_comms) > 1:
            bridges.append(node)

    # heuristic labels for each community
    labels = label_communities(communities, graph, partition, betw)

    return {
        "partition": partition,
        "communities": communities,
        "bridge_nodes": bridges,
        "modularity": round(modularity, 4),
        "labels": labels,
    }


def label_communities(
    communities: list[dict],
    graph: nx.DiGraph,
    partition: dict[str, int],
    betw: dict[str, float],
) -> dict[int, str]:
    """Assign heuristic labels based on community characteristics."""
    # gather stats for each community
    comm_stats = []

    for comm in communities:
        members = comm["members"]
        sz = comm["size"]
        dens = comm["density"]

        avg_betw = sum(betw.get(m, 0) for m in members) / sz if sz > 0 else 0
        avg_deg = sum(graph.degree(m) for m in members if graph.has_node(m)) / sz if sz > 0 else 0

        # count members connected outside their community
        bridge_cnt = 0
        inter_edges = 0

        for m in members:
            if not graph.has_node(m):
                continue
            for nbr in set(graph.predecessors(m)) | set(graph.successors(m)):
                if nbr in partition and partition[nbr] != comm["id"]:
                    inter_edges += 1
                    bridge_cnt += 1
                    break  # only count member once

        bridge_ratio = bridge_cnt / sz if sz > 0 else 0

        comm_stats.append({
            "id": comm["id"],
            "size": sz,
            "density": dens,
            "avg_betweenness": avg_betw,
            "avg_degree": avg_deg,
            "bridge_ratio": bridge_ratio,
            "inter_edges": inter_edges,
        })

    # rank by betweenness to determine who gets "executive" label
    ranked = sorted(comm_stats, key=lambda x: x["avg_betweenness"], reverse=True)

    labels: dict[int, str] = {}
    ops_num = 0

    for rank, s in enumerate(ranked):
        cid = s["id"]

        # small groups first
        if s["size"] < 5:
            labels[cid] = "Small Team" if s["size"] >= 3 else "Working Pair"
        elif rank == 0 and s["bridge_ratio"] > 0.3:
            labels[cid] = "Executive & Strategy"
        elif s["density"] > 0.15 and s["size"] < 100:
            labels[cid] = "Specialized Unit"
        elif s["size"] > 500 and s["density"] < 0.02:
            labels[cid] = "Extended Network"
        elif s["avg_degree"] > 15 and s["inter_edges"] > 50:
            labels[cid] = "Trading & Communications"
        elif s["density"] > 0.05 and 20 < s["size"] < 500:
            labels[cid] = "Core Operations"
        else:
            ops_num += 1
            labels[cid] = f"Operations Group {chr(64 + ops_num)}"

    return labels
