"""Infer unique role snapshots per person from email subject lines."""

import re
from collections import Counter
from pathlib import Path

from src.parser.email_parser import ParsedEmail

STOP_WORDS = {
    "re", "fw", "fwd", "the", "a", "an", "and", "or", "is", "in", "to",
    "for", "of", "on", "at", "by", "from", "with", "it", "this", "that",
    "be", "are", "was", "were", "been", "have", "has", "had", "do", "does",
    "did", "will", "would", "could", "should", "may", "might", "can",
    "not", "no", "but", "if", "so", "as", "up", "out", "about", "into",
    "over", "after", "before", "between", "under", "all", "each", "every",
    "both", "few", "more", "most", "other", "some", "such", "than", "too",
    "very", "just", "also", "now", "here", "there", "when", "where", "how",
    "what", "which", "who", "whom", "why", "its", "your", "our", "their",
    "my", "me", "we", "us", "you", "he", "she", "they", "him", "her",
    "them", "i", "am", "please", "thanks", "thank", "hi", "hello", "dear",
    "regards", "best", "new", "see", "need", "get", "one", "two", "let",
    "know", "per", "following", "information", "attached", "below",
}

# Pattern to strip Re:/Fw:/Fwd: prefixes
PREFIX_RE = re.compile(r"^(re|fw|fwd)\s*:\s*", re.IGNORECASE)
NON_ALPHA = re.compile(r"[^a-zA-Z\s]")


def _extract_keywords(subjects: list[str], top_n: int = 10) -> list[str]:
    """Extract top keywords from a list of email subjects."""
    word_counts: Counter = Counter()
    for subj in subjects:
        # Strip Re:/Fw: prefixes
        clean = PREFIX_RE.sub("", subj).strip()
        clean = PREFIX_RE.sub("", clean).strip()  # double strip for Re: Re:
        clean = NON_ALPHA.sub(" ", clean).lower()
        words = clean.split()
        for w in words:
            if len(w) > 2 and w not in STOP_WORDS:
                word_counts[w] += 1

    return [word for word, _ in word_counts.most_common(top_n)]


def infer_role_snapshots(
    emails: list[ParsedEmail],
    graph_data: dict,
) -> dict[str, str]:
    """Build unique role snapshot text for each person from their email subjects.

    Args:
        emails: Parsed email objects (from parse_all_emails)
        graph_data: The graph.json-style dict with nodes and edges

    Returns:
        dict mapping person_id to role_snapshot text
    """
    # Group subjects by sender email
    subjects_by_sender: dict[str, list[str]] = {}
    for em in emails:
        sender = em.sender
        if em.subject:
            subjects_by_sender.setdefault(sender, []).append(em.subject)

    # Build node lookup
    node_map = {n["id"]: n for n in graph_data.get("nodes", [])}

    # Compute edge stats per person
    sent_counts: Counter = Counter()
    received_counts: Counter = Counter()
    for e in graph_data.get("edges", []):
        sent_counts[e["source"]] += e.get("email_count", 0)
        received_counts[e["target"]] += e.get("email_count", 0)

    snapshots: dict[str, str] = {}

    for person_id, node in node_map.items():
        subjects = subjects_by_sender.get(person_id, [])
        keywords = _extract_keywords(subjects, top_n=8)

        total_sent = sent_counts.get(person_id, 0)
        total_received = received_counts.get(person_id, 0)
        total = total_sent + total_received

        betweenness = node.get("betweenness", 0)
        degree = node.get("degree_centrality", 0)

        # Connectivity label
        if degree > 0.05:
            connectivity = "high"
        elif degree > 0.01:
            connectivity = "moderate"
        else:
            connectivity = "low"

        if len(keywords) >= 3:
            topic_part = (
                f"Primarily involved in {keywords[0]}. "
                f"Active in {keywords[1]} and {keywords[2]}."
            )
        elif len(keywords) >= 1:
            topic_part = f"Primarily involved in {keywords[0]}."
        else:
            topic_part = "Limited email subject data available."

        # Emails per day (approximate 2-year span)
        total_edge_emails = total_sent if total_sent > 0 else node.get("total_sent", 0)

        # Compute actual date range from edges
        first_dates = []
        last_dates = []
        for e in graph_data.get("edges", []):
            if e["source"] == person_id or e["target"] == person_id:
                if e.get("first_email"):
                    first_dates.append(e["first_email"])
                if e.get("last_email"):
                    last_dates.append(e["last_email"])

        if first_dates and last_dates:
            earliest = min(first_dates)
            latest = max(last_dates)
            try:
                from datetime import datetime
                d1 = datetime.fromisoformat(earliest.replace("Z", "+00:00"))
                d2 = datetime.fromisoformat(latest.replace("Z", "+00:00"))
                days_active = max((d2 - d1).days, 1)
            except Exception:
                days_active = 730  # fallback ~2 years
        else:
            days_active = 730

        epd = round(total_edge_emails / days_active, 1)

        snapshot = (
            f"{topic_part} "
            f"Sends {total_sent} emails over {days_active} days ({epd}/day) "
            f"with {connectivity} network connectivity."
        )

        snapshots[person_id] = snapshot

    return snapshots
