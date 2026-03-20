"""Orchestrator — runs the full data pipeline end to end."""

import json
import time
from pathlib import Path
from datetime import datetime

from src.parser.enron_extractor import extract_enron, DEFAULT_ARCHIVE, DEFAULT_OUTPUT
from src.parser.email_parser import parse_all_emails
from src.graph.builder import build_graph
from src.graph.weights import compute_weights
from src.sentiment.analyzer import enrich_graph_with_sentiment, get_sentiment_summary
from src.metrics.centrality import compute_centrality
from src.metrics.community import detect_communities
from src.metrics.dead_man_switch import compute_dead_man_switch
from src.metrics.waste import compute_waste
from src.metrics.health import compute_health
from src.analysis.role_inference import infer_role_snapshots


OUT_DIR = Path(__file__).resolve().parent.parent / "output"


def _json_fallback(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError("Can't serialize %s" % type(obj))


def _banner(msg: str):
    print("\n" + "=" * 60)
    print(msg)
    print("=" * 60)


def _export_graph(G, centrality, partition, output_dir):
    """build graph.json from networkx graph + computed metrics"""
    nodes = []
    for nid in G.nodes():
        attr = dict(G.nodes[nid])
        nc = centrality.get(nid, {})
        nodes.append({
            "id": nid,
            "name": attr.get("name", nid),
            "email": attr.get("email", nid),
            "total_sent": attr.get("total_sent", 0),
            "total_received": attr.get("total_received", 0),
            "department": attr.get("department"),
            "community_id": partition.get(nid),
            "pagerank": round(nc.get("pagerank", 0), 6),
            "betweenness": round(nc.get("betweenness_centrality", 0), 6),
            "eigenvector": round(nc.get("eigenvector_centrality", 0), 6),
            "degree_centrality": round(nc.get("degree_centrality", 0), 6),
            "in_degree_centrality": round(nc.get("in_degree_centrality", 0), 6),
            "out_degree_centrality": round(nc.get("out_degree_centrality", 0), 6),
            "avg_sent_sentiment": attr.get("avg_sent_sentiment", 0),
            "avg_received_sentiment": attr.get("avg_received_sentiment", 0),
        })

    edges = []
    for u, v, edata in G.edges(data=True):
        edges.append({
            "source": u,
            "target": v,
            "email_count": edata.get("email_count", 0),
            "weight": round(edata.get("weight", 0), 4),
            "sentiment": edata.get("sentiment", 0),
            "sentiment_asymmetry": edata.get("sentiment_asymmetry", 0),
            "first_email": edata.get("first_email"),
            "last_email": edata.get("last_email"),
            "norm_frequency": round(edata.get("norm_frequency", 0), 4),
            "norm_recency": round(edata.get("norm_recency", 0), 4),
        })

    graph_out = {"nodes": nodes, "edges": edges}
    with open(output_dir / "graph.json", "w") as f:
        json.dump(graph_out, f, default=_json_fallback, indent=2)
    print("  graph.json: %d nodes, %d edges" % (len(nodes), len(edges)))
    return graph_out


def _export_communities(comms, output_dir):
    labels = comms.get("labels", {})
    out = {
        "communities": [
            {
                "id": c["id"],
                "members": c["members"],
                "size": c["size"],
                "density": c["density"],
                "label": labels.get(c["id"], "Community %d" % c["id"]),
            }
            for c in comms["communities"]
        ],
        "bridge_nodes": comms["bridge_nodes"],
        "modularity": comms["modularity"],
    }
    with open(output_dir / "communities.json", "w") as f:
        json.dump(out, f, indent=2)
    print("  communities.json: %d communities" % len(out["communities"]))
    return out


def _export_metrics(centrality, health, sent_summary, dms, waste, G, output_dir):
    out = {
        "health": health,
        "sentiment": sent_summary,
        "dead_man_switch": dms[:20],
        "waste": waste[:20],
        "top_centrality": {
            "pagerank": sorted(
                [{"id": n, "name": centrality[n].get("name", G.nodes[n].get("name", n)),
                  "score": centrality[n]["pagerank"]} for n in centrality],
                key=lambda x: x["score"], reverse=True,
            )[:20],
            "betweenness": sorted(
                [{"id": n, "name": G.nodes[n].get("name", n),
                  "score": centrality[n]["betweenness_centrality"]} for n in centrality],
                key=lambda x: x["score"], reverse=True,
            )[:20],
        },
    }
    with open(output_dir / "metrics.json", "w") as f:
        json.dump(out, f, default=_json_fallback, indent=2)
    print("  metrics.json written")


def _export_people(G, centrality, comms, dms, waste, people_dir):
    """per-person json files with metrics + top connections"""
    dms_map = {d["id"]: d for d in dms}
    waste_map = {w["id"]: w for w in waste}

    for nid in G.nodes():
        person = {
            "id": nid,
            "name": G.nodes[nid].get("name", nid),
            "email": nid,
            "community_id": comms["partition"].get(nid),
            "metrics": centrality.get(nid, {}),
            "sentiment": {
                "avg_sent": G.nodes[nid].get("avg_sent_sentiment", 0),
                "avg_received": G.nodes[nid].get("avg_received_sentiment", 0),
            },
            "dead_man_switch": dms_map.get(nid, {}),
            "waste": waste_map.get(nid, {}),
            "connections": [],
        }

        # top 20 outgoing by weight
        out_edges = sorted(
            [(v, d) for _, v, d in G.edges(nid, data=True)],
            key=lambda x: x[1].get("weight", 0), reverse=True,
        )[:20]
        for tgt, edata in out_edges:
            person["connections"].append({
                "id": tgt,
                "name": G.nodes[tgt].get("name", tgt),
                "direction": "outgoing",
                "email_count": edata.get("email_count", 0),
                "weight": round(edata.get("weight", 0), 4),
                "sentiment": edata.get("sentiment", 0),
            })

        # top 20 incoming
        in_edges = sorted(
            [(u, d) for u, _, d in G.in_edges(nid, data=True)],
            key=lambda x: x[1].get("weight", 0), reverse=True,
        )[:20]
        for src, edata in in_edges:
            person["connections"].append({
                "id": src,
                "name": G.nodes[src].get("name", src),
                "direction": "incoming",
                "email_count": edata.get("email_count", 0),
                "weight": round(edata.get("weight", 0), 4),
                "sentiment": edata.get("sentiment", 0),
            })

        safe_name = nid.replace("@", "_at_").replace(".", "_").replace("/", "_")
        with open(people_dir / "{}.json".format(safe_name), "w") as f:
            json.dump(person, f, default=_json_fallback, indent=2)

    print("  people/: %d person files" % G.number_of_nodes())


def run_pipeline(
    archive_path: Path = DEFAULT_ARCHIVE,
    maildir_path: Path = DEFAULT_OUTPUT,
    output_dir: Path = OUT_DIR,
    min_emails: int = 3,
):
    """Run the full pipeline end-to-end."""
    t0 = time.time()

    # extract
    _banner("STEP 1: Extracting Enron dataset...")
    maildir = extract_enron(archive_path, maildir_path.parent)

    # parse
    _banner("STEP 2: Parsing emails...")
    emails = parse_all_emails(maildir)
    print("  Total emails: %d" % len(emails))

    # graph
    _banner("STEP 3: Building communication graph...")
    G = build_graph(emails, min_emails=min_emails)
    print("  Nodes: %d" % G.number_of_nodes())
    print("  Edges: %d" % G.number_of_edges())

    print("\n  Computing edge weights...")
    G = compute_weights(G)

    # sentiment
    _banner("STEP 4: Running sentiment analysis...")
    G = enrich_graph_with_sentiment(G, emails)
    sent_summary = get_sentiment_summary(G)
    print("  Avg sentiment: %s" % sent_summary["avg_sentiment"])

    # recompute weights now that sentiment is on the edges
    G = compute_weights(G)

    # metrics
    _banner("STEP 5: Computing graph metrics...")

    print("  Computing centrality...")
    centrality = compute_centrality(G)

    print("  Detecting communities...")
    comms = detect_communities(G)
    print("  Found %d communities (modularity=%s)" % (len(comms["communities"]), comms["modularity"]))

    print("  Computing dead-man-switch scores...")
    dms = compute_dead_man_switch(G)

    print("  Computing waste metrics...")
    waste = compute_waste(G, emails)

    print("  Computing org health score...")
    health = compute_health(G, comms)
    print("  Health score: %s/100 (Grade: %s)" % (health["health_score"], health["grade"]))

    # export everything
    _banner("STEP 6: Exporting to JSON...")

    output_dir.mkdir(parents=True, exist_ok=True)
    people_dir = output_dir / "people"
    people_dir.mkdir(parents=True, exist_ok=True)

    graph_data = _export_graph(G, centrality, comms["partition"], output_dir)
    _export_communities(comms, output_dir)
    _export_metrics(centrality, health, sent_summary, dms, waste, G, output_dir)
    _export_people(G, centrality, comms, dms, waste, people_dir)

    # role snapshots — uses email subjects + graph structure
    print("  Computing role snapshots from email subjects...")
    roles = infer_role_snapshots(emails, graph_data)
    with open(output_dir / "role_snapshots.json", "w") as f:
        json.dump(roles, f, indent=2)
    print("  role_snapshots.json: %d snapshots" % len(roles))

    elapsed = time.time() - t0
    print("\n" + "=" * 60)
    print("Pipeline complete in %.1fs" % elapsed)
    print("=" * 60)

    return {
        "graph": G,
        "emails": emails,
        "centrality": centrality,
        "communities": comms,
        "dms": dms,
        "waste": waste,
        "health": health,
        "sentiment": sent_summary,
    }


if __name__ == "__main__":
    run_pipeline()
