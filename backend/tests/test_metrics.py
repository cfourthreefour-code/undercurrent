"""Graph metrics tests — centrality, communities, dms, waste, health."""

from datetime import datetime, timezone

import networkx as nx

from src.graph.builder import build_graph
from src.graph.weights import compute_weights
from src.metrics.centrality import compute_centrality
from src.metrics.community import detect_communities
from src.metrics.dead_man_switch import compute_dead_man_switch
from src.metrics.health import compute_health
from src.metrics.waste import compute_waste
from src.parser.email_parser import ParsedEmail


def _email(sender, to, subject="Test", date=None, cc=None, bcc=None):
    return ParsedEmail(
        message_id="<%s-%s-%d@test>" % (sender, to[0], hash(subject) % 10000),
        sender=sender,
        recipients_to=to,
        recipients_cc=cc or [],
        recipients_bcc=bcc or [],
        subject=subject,
        body="Body of %s" % subject,
        date=date or datetime(2001, 5, 14, tzinfo=timezone.utc),
    )


def _star_graph():
    """center node connected to 4 spokes"""
    msgs = []
    center = "center@enron.com"
    spokes = ["spoke%d@enron.com" % i for i in range(4)]
    for sp in spokes:
        for j in range(5):
            msgs.append(_email(center, [sp], subject="msg%d" % j))
            msgs.append(_email(sp, [center], subject="reply%d" % j))
    G = build_graph(msgs, min_emails=1)
    return compute_weights(G)


def _two_clusters():
    """two cliques connected by a single bridge"""
    msgs = []

    # cluster A: a0, a1, a2
    for i in range(3):
        for j in range(3):
            if i == j:
                continue
            for k in range(5):
                msgs.append(_email(
                    "a%d@enron.com" % i, ["a%d@enron.com" % j],
                    subject="a%da%d_%d" % (i, j, k)))

    # cluster B: b0, b1, b2
    for i in range(3):
        for j in range(3):
            if i == j:
                continue
            for k in range(5):
                msgs.append(_email(
                    "b%d@enron.com" % i, ["b%d@enron.com" % j],
                    subject="b%db%d_%d" % (i, j, k)))

    # bridge: a0 <-> b0
    for k in range(5):
        msgs.append(_email("a0@enron.com", ["b0@enron.com"], subject="bridge_%d" % k))
        msgs.append(_email("b0@enron.com", ["a0@enron.com"], subject="bridge_r%d" % k))

    G = build_graph(msgs, min_emails=1)
    return compute_weights(G), msgs


class TestCentrality:
    def test_center_highest(self):
        G = _star_graph()
        cent = compute_centrality(G)
        c = cent["center@enron.com"]
        for i in range(4):
            sp = cent["spoke%d@enron.com" % i]
            assert c["betweenness_centrality"] >= sp["betweenness_centrality"]
            assert c["degree_centrality"] > sp["degree_centrality"]

    def test_all_fields_present(self):
        G = _star_graph()
        cent = compute_centrality(G)
        for nid, m in cent.items():
            assert "in_degree_centrality" in m
            assert "out_degree_centrality" in m
            assert "degree_centrality" in m
            assert "betweenness_centrality" in m
            assert "eigenvector_centrality" in m
            assert "pagerank" in m

    def test_pagerank_sums_to_one(self):
        G = _star_graph()
        cent = compute_centrality(G)
        total = sum(v["pagerank"] for v in cent.values())
        assert abs(total - 1.0) < 0.01


class TestCommunity:
    def test_finds_two_clusters(self):
        G, _ = _two_clusters()
        result = detect_communities(G)
        assert len(result["communities"]) >= 2
        assert result["modularity"] > 0

    def test_bridge_detected(self):
        G, _ = _two_clusters()
        result = detect_communities(G)
        bridges = set(result["bridge_nodes"])
        assert "a0@enron.com" in bridges or "b0@enron.com" in bridges

    def test_partition_complete(self):
        G, _ = _two_clusters()
        result = detect_communities(G)
        assert set(result["partition"].keys()) == set(G.nodes())


class TestDeadManSwitch:
    def test_center_most_critical(self):
        G = _star_graph()
        dms = compute_dead_man_switch(G)
        assert len(dms) > 0
        assert dms[0]["id"] == "center@enron.com"

    def test_required_fields(self):
        G = _star_graph()
        dms = compute_dead_man_switch(G)
        for entry in dms:
            assert "id" in entry
            assert "name" in entry
            assert "dms_score" in entry
            assert "betweenness" in entry
            assert "eigenvector" in entry
            assert "impact_pct" in entry


class TestWaste:
    def test_broadcaster_higher(self):
        msgs = []
        # normal 1:1 sender
        for i in range(10):
            msgs.append(_email("normal@enron.com", ["target@enron.com"], subject="n%d" % i))
            msgs.append(_email("target@enron.com", ["normal@enron.com"], subject="r%d" % i))

        # broadcaster blasts 7 people
        recips = ["r%d@enron.com" % i for i in range(7)]
        for i in range(10):
            msgs.append(_email("broadcaster@enron.com", recips, subject="b%d" % i))
        for r in recips:
            for i in range(3):
                msgs.append(_email(r, ["broadcaster@enron.com"], subject="re%d" % i))

        G = build_graph(msgs, min_emails=1)
        G = compute_weights(G)
        w = compute_waste(G, msgs)
        wmap = {x["id"]: x for x in w}
        assert wmap["broadcaster@enron.com"]["broadcast_ratio"] > wmap["normal@enron.com"]["broadcast_ratio"]

    def test_score_range(self):
        msgs = []
        for i in range(5):
            msgs.append(_email("a@enron.com", ["b@enron.com"], subject="s%d" % i))
            msgs.append(_email("b@enron.com", ["a@enron.com"], subject="r%d" % i))
        G = build_graph(msgs, min_emails=1)
        G = compute_weights(G)
        w = compute_waste(G, msgs)
        for entry in w:
            assert 0 <= entry["waste_score"] <= 100


class TestHealth:
    def test_score_range(self):
        G, _ = _two_clusters()
        comms = detect_communities(G)
        h = compute_health(G, comms)
        assert 0 <= h["health_score"] <= 100
        assert h["grade"] in {"A", "B", "C", "D", "F"}

    def test_sub_scores(self):
        G, _ = _two_clusters()
        comms = detect_communities(G)
        h = compute_health(G, comms)
        assert "connectivity" in h["sub_scores"]
        assert "bottleneck_risk" in h["sub_scores"]
        assert "silo_score" in h["sub_scores"]
        assert "efficiency" in h["sub_scores"]

    def test_stats(self):
        G, _ = _two_clusters()
        comms = detect_communities(G)
        h = compute_health(G, comms)
        assert h["stats"]["node_count"] == G.number_of_nodes()
        assert h["stats"]["edge_count"] == G.number_of_edges()
