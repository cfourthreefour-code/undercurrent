"""Analyze email sentiment and enrich graph edges."""

from collections import defaultdict

import networkx as nx
from textblob import TextBlob

from src.parser.email_parser import ParsedEmail


def analyze_sentiment(text: str) -> float:
    """Get polarity score for text (-1 to +1)."""
    return TextBlob(text).sentiment.polarity


def compute_email_sentiments(emails: list[ParsedEmail], progress: bool = True) -> list[tuple[ParsedEmail, float]]:
    """Run sentiment analysis on each email body.

    Returns list of (email, polarity_score) tuples.
    """
    scored = []
    for idx, msg in enumerate(emails):
        score = analyze_sentiment(msg.body)
        scored.append((msg, score))
        if progress and (idx + 1) % 20000 == 0:
            print(f"  Sentiment: {idx + 1}/{len(emails)}")

    if progress:
        print(f"  Sentiment: {len(emails)} emails analyzed")
    return scored


def enrich_graph_with_sentiment(
    graph: nx.DiGraph,
    emails: list[ParsedEmail],
    progress: bool = True,
) -> nx.DiGraph:
    """Add sentiment scores to graph edges and nodes.

    Edge attrs added:
    - sentiment: avg polarity for source→target emails
    - sentiment_count: number of emails
    - sentiment_asymmetry: diff between forward/reverse edge sentiment

    Node attrs added:
    - avg_sent_sentiment: avg polarity of outgoing emails
    - avg_received_sentiment: avg polarity of incoming emails
    """
    # compute all sentiment scores
    scored_emails = compute_email_sentiments(emails, progress=progress)

    # aggregate by edge and node
    edge_scores: dict[tuple[str, str], list[float]] = defaultdict(list)
    sent_scores: dict[str, list[float]] = defaultdict(list)
    recv_scores: dict[str, list[float]] = defaultdict(list)

    for msg, score in scored_emails:
        sender = msg.sender
        recipients = msg.recipients_to + msg.recipients_cc + msg.recipients_bcc

        sent_scores[sender].append(score)

        for recip in recipients:
            if sender == recip:
                continue  # skip self-loops

            edge_scores[(sender, recip)].append(score)
            recv_scores[recip].append(score)

    # update edges
    for (sender, recip), scores in edge_scores.items():
        if graph.has_edge(sender, recip):
            avg = sum(scores) / len(scores)
            graph[sender][recip]["sentiment"] = round(avg, 4)
            graph[sender][recip]["sentiment_count"] = len(scores)

    # update nodes
    for node in graph.nodes():
        sent = sent_scores.get(node, [])
        recv = recv_scores.get(node, [])

        graph.nodes[node]["avg_sent_sentiment"] = round(sum(sent) / len(sent), 4) if sent else 0
        graph.nodes[node]["avg_received_sentiment"] = round(sum(recv) / len(recv), 4) if recv else 0

    # compute sentiment asymmetry (how different is A→B vs B→A sentiment?)
    for src, tgt, data in graph.edges(data=True):
        forward = data.get("sentiment", 0)
        reverse = graph[tgt][src].get("sentiment", 0) if graph.has_edge(tgt, src) else 0
        data["sentiment_asymmetry"] = round(abs(forward - reverse), 4)

    return graph


def get_sentiment_summary(graph: nx.DiGraph) -> dict:
    """Extract sentiment stats from enriched graph."""
    all_scores = []
    negative_edges = []
    positive_edges = []

    for src, tgt, data in graph.edges(data=True):
        score = data.get("sentiment")
        if score is not None:
            all_scores.append(score)

            if score < -0.1:
                negative_edges.append({
                    "source": src,
                    "target": tgt,
                    "sentiment": score,
                    "source_name": graph.nodes[src].get("name", src),
                    "target_name": graph.nodes[tgt].get("name", tgt),
                })
            elif score > 0.2:
                positive_edges.append({
                    "source": src,
                    "target": tgt,
                    "sentiment": score,
                    "source_name": graph.nodes[src].get("name", src),
                    "target_name": graph.nodes[tgt].get("name", tgt),
                })

    avg = sum(all_scores) / len(all_scores) if all_scores else 0

    # bucket sentiment distribution
    buckets = {"very_negative": 0, "negative": 0, "neutral": 0, "positive": 0, "very_positive": 0}
    for score in all_scores:
        if score < -0.3:
            buckets["very_negative"] += 1
        elif score < -0.1:
            buckets["negative"] += 1
        elif score < 0.1:
            buckets["neutral"] += 1
        elif score < 0.3:
            buckets["positive"] += 1
        else:
            buckets["very_positive"] += 1

    # sort by sentiment
    negative_edges.sort(key=lambda x: x["sentiment"])
    positive_edges.sort(key=lambda x: x["sentiment"], reverse=True)

    return {
        "avg_sentiment": round(avg, 4),
        "total_edges_with_sentiment": len(all_scores),
        "distribution": buckets,
        "top_negative": negative_edges[:10],
        "top_positive": positive_edges[:10],
    }
