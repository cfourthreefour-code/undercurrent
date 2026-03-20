"""Graph construction + weight tests."""

from datetime import datetime, timezone

import networkx as nx

from src.graph.builder import build_graph, extract_display_name
from src.graph.weights import compute_weights
from src.parser.email_parser import ParsedEmail


def _email(sender, to, subject="Test", date=None, cc=None, bcc=None):
    """quick helper to build a ParsedEmail"""
    return ParsedEmail(
        message_id="<%s-%s-%d@enron.com>" % (sender, to[0], hash(subject) % 10000),
        sender=sender,
        recipients_to=to,
        recipients_cc=cc or [],
        recipients_bcc=bcc or [],
        subject=subject,
        body="Body of %s" % subject,
        date=date or datetime(2001, 5, 14, tzinfo=timezone.utc),
    )


class TestExtractDisplayName:
    def test_dotted(self):
        assert extract_display_name("john.smith@enron.com") == "John Smith"

    def test_underscored(self):
        assert extract_display_name("john_smith@enron.com") == "John Smith"

    def test_single(self):
        assert extract_display_name("john@enron.com") == "John"


class TestBuildGraph:
    def test_basic(self):
        msgs = [
            _email("a@enron.com", ["b@enron.com"]),
            _email("a@enron.com", ["b@enron.com"], subject="Another"),
            _email("a@enron.com", ["b@enron.com"], subject="Third"),
            _email("b@enron.com", ["a@enron.com"]),
            _email("b@enron.com", ["a@enron.com"], subject="Reply"),
            _email("b@enron.com", ["a@enron.com"], subject="Reply2"),
        ]
        G = build_graph(msgs, min_emails=3)
        assert G.number_of_nodes() == 2
        assert G.number_of_edges() == 2
        assert G["a@enron.com"]["b@enron.com"]["email_count"] == 3

    def test_below_threshold(self):
        msgs = [
            _email("a@enron.com", ["b@enron.com"]),
            _email("a@enron.com", ["b@enron.com"], subject="Two"),
        ]
        G = build_graph(msgs, min_emails=3)
        assert G.number_of_edges() == 0

    def test_threshold_one(self):
        msgs = [_email("a@enron.com", ["b@enron.com"])]
        G = build_graph(msgs, min_emails=1)
        assert G.number_of_edges() == 1

    def test_enron_only(self):
        msgs = [
            _email("a@enron.com", ["external@gmail.com"]),
            _email("a@enron.com", ["external@gmail.com"], subject="2"),
            _email("a@enron.com", ["external@gmail.com"], subject="3"),
        ]
        G = build_graph(msgs, min_emails=1, enron_only=True)
        assert "external@gmail.com" not in G.nodes()

    def test_no_self_loops(self):
        msgs = [
            _email("a@enron.com", ["a@enron.com"]),
            _email("a@enron.com", ["a@enron.com"], subject="2"),
            _email("a@enron.com", ["a@enron.com"], subject="3"),
        ]
        G = build_graph(msgs, min_emails=1)
        assert G.number_of_edges() == 0

    def test_node_attrs(self):
        msgs = [
            _email("john.smith@enron.com", ["jane.doe@enron.com"]),
            _email("john.smith@enron.com", ["jane.doe@enron.com"], subject="2"),
            _email("john.smith@enron.com", ["jane.doe@enron.com"], subject="3"),
        ]
        G = build_graph(msgs, min_emails=1)
        n = G.nodes["john.smith@enron.com"]
        assert n["name"] == "John Smith"
        assert n["email"] == "john.smith@enron.com"
        assert n["total_sent"] == 3

    def test_cc_edges(self):
        msgs = [
            _email("a@enron.com", ["b@enron.com"], cc=["c@enron.com"]),
            _email("a@enron.com", ["b@enron.com"], cc=["c@enron.com"], subject="2"),
            _email("a@enron.com", ["b@enron.com"], cc=["c@enron.com"], subject="3"),
        ]
        G = build_graph(msgs, min_emails=3)
        assert G.has_edge("a@enron.com", "b@enron.com")
        assert G.has_edge("a@enron.com", "c@enron.com")

    def test_directed(self):
        """a->b should not imply b->a"""
        msgs = [
            _email("a@enron.com", ["b@enron.com"]),
            _email("a@enron.com", ["b@enron.com"], subject="2"),
            _email("a@enron.com", ["b@enron.com"], subject="3"),
        ]
        G = build_graph(msgs, min_emails=1)
        assert G.has_edge("a@enron.com", "b@enron.com")
        assert not G.has_edge("b@enron.com", "a@enron.com")

    def test_edge_dates(self):
        msgs = [
            _email("a@enron.com", ["b@enron.com"], date=datetime(2001, 1, 1, tzinfo=timezone.utc)),
            _email("a@enron.com", ["b@enron.com"], date=datetime(2001, 6, 1, tzinfo=timezone.utc), subject="2"),
            _email("a@enron.com", ["b@enron.com"], date=datetime(2001, 12, 1, tzinfo=timezone.utc), subject="3"),
        ]
        G = build_graph(msgs, min_emails=1)
        edge = G["a@enron.com"]["b@enron.com"]
        assert edge["first_email"] == datetime(2001, 1, 1, tzinfo=timezone.utc)
        assert edge["last_email"] == datetime(2001, 12, 1, tzinfo=timezone.utc)


class TestWeights:
    def test_range(self):
        msgs = [
            _email("a@enron.com", ["b@enron.com"], date=datetime(2001, 5, 1, tzinfo=timezone.utc)),
            _email("a@enron.com", ["b@enron.com"], date=datetime(2001, 5, 2, tzinfo=timezone.utc), subject="2"),
            _email("a@enron.com", ["b@enron.com"], date=datetime(2001, 5, 3, tzinfo=timezone.utc), subject="3"),
        ]
        G = build_graph(msgs, min_emails=1)
        G = compute_weights(G)
        for _, _, d in G.edges(data=True):
            assert 0 <= d["weight"] <= 1.0
            assert "norm_frequency" in d
            assert "norm_recency" in d

    def test_more_emails_higher_weight(self):
        msgs = []
        for i in range(10):
            msgs.append(_email("a@enron.com", ["b@enron.com"],
                               subject="s%d" % i, date=datetime(2001, 5, 1, tzinfo=timezone.utc)))
        for i in range(3):
            msgs.append(_email("a@enron.com", ["c@enron.com"],
                               subject="s%d" % i, date=datetime(2001, 5, 1, tzinfo=timezone.utc)))

        G = build_graph(msgs, min_emails=1)
        G = compute_weights(G)
        w_ab = G["a@enron.com"]["b@enron.com"]["weight"]
        w_ac = G["a@enron.com"]["c@enron.com"]["weight"]
        assert w_ab > w_ac

    def test_recency(self):
        msgs = [
            _email("a@enron.com", ["b@enron.com"], date=datetime(2001, 12, 1, tzinfo=timezone.utc)),
            _email("a@enron.com", ["c@enron.com"], date=datetime(2000, 1, 1, tzinfo=timezone.utc)),
        ]
        G = build_graph(msgs, min_emails=1)
        G = compute_weights(G, reference_date=datetime(2001, 12, 31, tzinfo=timezone.utc))
        r_ab = G["a@enron.com"]["b@enron.com"]["norm_recency"]
        r_ac = G["a@enron.com"]["c@enron.com"]["norm_recency"]
        assert r_ab > r_ac
