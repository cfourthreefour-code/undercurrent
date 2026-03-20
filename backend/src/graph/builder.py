"""Build a NetworkX graph from parsed emails."""

from collections import defaultdict
from datetime import datetime

import networkx as nx

from src.parser.email_parser import ParsedEmail


def extract_display_name(email_addr: str) -> str:
    """Turn email into display name: john.smith@enron.com → John Smith."""
    local_part = email_addr.split("@")[0]
    parts = local_part.replace("_", ".").replace("-", ".").split(".")
    return " ".join(p.capitalize() for p in parts if p)


def build_graph(
    emails: list[ParsedEmail],
    min_emails: int = 3,
    enron_only: bool = True,
) -> nx.DiGraph:
    """Build weighted directed graph from parsed email data.

    Args:
        emails: List of ParsedEmail objects
        min_emails: Min email count for an edge to be included
        enron_only: Only include @enron.com addresses

    Returns:
        NetworkX DiGraph with node and edge attributes
    """
    # aggregate edges
    edges: dict[tuple[str, str], dict] = defaultdict(lambda: {
        "email_count": 0,
        "first_email": None,
        "last_email": None,
        "subjects": [],
    })

    # track node stats
    sent_counts: dict[str, int] = defaultdict(int)
    recv_counts: dict[str, int] = defaultdict(int)
    display_names: dict[str, str] = {}

    for msg in emails:
        sender = msg.sender

        # skip non-enron if filtering
        if enron_only and not sender.endswith("@enron.com"):
            continue

        recipients = msg.recipients_to + msg.recipients_cc + msg.recipients_bcc

        for recip in recipients:
            if enron_only and not recip.endswith("@enron.com"):
                continue

            # skip self-loops
            if sender == recip:
                continue

            edge_key = (sender, recip)
            edge = edges[edge_key]
            edge["email_count"] += 1

            # track date range
            if msg.date:
                if edge["first_email"] is None or msg.date < edge["first_email"]:
                    edge["first_email"] = msg.date
                if edge["last_email"] is None or msg.date > edge["last_email"]:
                    edge["last_email"] = msg.date

            if msg.subject:
                edge["subjects"].append(msg.subject)

            sent_counts[sender] += 1
            recv_counts[recip] += 1

            # remember display names
            if sender not in display_names:
                display_names[sender] = extract_display_name(sender)
            if recip not in display_names:
                display_names[recip] = extract_display_name(recip)

    # build the graph
    graph = nx.DiGraph()

    # add edges above threshold
    for (sender, recip), edge in edges.items():
        if edge["email_count"] >= min_emails:
            graph.add_edge(
                sender, recip,
                email_count=edge["email_count"],
                first_email=edge["first_email"],
                last_email=edge["last_email"],
                subjects=edge["subjects"][:50],  # cap at 50
            )

    # set node attrs
    for node in graph.nodes():
        graph.nodes[node]["name"] = display_names.get(node, extract_display_name(node))
        graph.nodes[node]["email"] = node
        graph.nodes[node]["total_sent"] = sent_counts.get(node, 0)
        graph.nodes[node]["total_received"] = recv_counts.get(node, 0)
        graph.nodes[node]["department"] = None  # TODO: infer from email patterns

    return graph
