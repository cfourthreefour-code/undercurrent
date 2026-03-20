"""Sentiment analysis tests."""

from datetime import datetime, timezone

from src.graph.builder import build_graph
from src.graph.weights import compute_weights
from src.parser.email_parser import ParsedEmail
from src.sentiment.analyzer import analyze_sentiment, enrich_graph_with_sentiment


def _email(sender, to, subject, body, date=None):
    return ParsedEmail(
        message_id="<%d@test>" % (hash(body) % 100000),
        sender=sender,
        recipients_to=to,
        recipients_cc=[],
        recipients_bcc=[],
        subject=subject,
        body=body,
        date=date or datetime(2001, 5, 14, tzinfo=timezone.utc),
    )


class TestAnalyzeSentiment:
    def test_positive(self):
        score = analyze_sentiment(
            "This is wonderful! Great job, I'm really happy with the results. Excellent work!"
        )
        assert score > 0

    def test_negative(self):
        score = analyze_sentiment(
            "This is terrible and frustrating. The results are awful and disappointing. Very bad."
        )
        assert score < 0

    def test_neutral(self):
        score = analyze_sentiment(
            "The meeting is scheduled for Tuesday at 3pm in the conference room."
        )
        assert -0.2 < score < 0.2

    def test_bounded(self):
        score = analyze_sentiment("Some text here")
        assert -1 <= score <= 1


class TestEnrichGraph:
    def test_edge_sentiment(self):
        msgs = [
            _email("a@enron.com", ["b@enron.com"], "Good news",
                   "This is great! Wonderful results, I'm very happy!"),
            _email("a@enron.com", ["b@enron.com"], "More good news",
                   "Excellent progress! Keep up the amazing work!"),
            _email("a@enron.com", ["b@enron.com"], "Still good",
                   "Everything is going perfectly!"),
        ]
        G = build_graph(msgs, min_emails=1)
        G = compute_weights(G)
        G = enrich_graph_with_sentiment(G, msgs, progress=False)

        edge = G["a@enron.com"]["b@enron.com"]
        assert "sentiment" in edge
        assert edge["sentiment"] > 0

    def test_node_sentiment(self):
        msgs = [
            _email("a@enron.com", ["b@enron.com"], "Test",
                   "Great job! This is amazing!"),
            _email("a@enron.com", ["b@enron.com"], "Test2",
                   "Wonderful work! I love it!"),
            _email("a@enron.com", ["b@enron.com"], "Test3",
                   "Fantastic results! Very positive outcome!"),
        ]
        G = build_graph(msgs, min_emails=1)
        G = compute_weights(G)
        G = enrich_graph_with_sentiment(G, msgs, progress=False)

        assert "avg_sent_sentiment" in G.nodes["a@enron.com"]
        assert G.nodes["a@enron.com"]["avg_sent_sentiment"] > 0
