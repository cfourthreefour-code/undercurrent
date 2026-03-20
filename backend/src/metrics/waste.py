"""Communication waste metrics."""

from collections import defaultdict

import networkx as nx

from src.parser.email_parser import ParsedEmail


def compute_waste(
    graph: nx.DiGraph,
    emails: list[ParsedEmail],
    broadcast_threshold: int = 5,
) -> list[dict]:
    """Score communication waste per person.

    Measures: overproduction (cc/bcc spam), broadcast ratio, reply-all abuse, orphaned emails.
    """
    # aggregate stats per sender
    stats_by_sender: dict[str, dict] = defaultdict(lambda: {
        "total_sent": 0,
        "total_cc_bcc": 0,
        "broadcast_count": 0,
        "reply_all_count": 0,
        "recipients_per_email": [],
    })

    for msg in emails:
        sender = msg.sender
        if sender not in graph.nodes():
            continue

        s = stats_by_sender[sender]
        s["total_sent"] += 1
        s["total_cc_bcc"] += len(msg.recipients_cc) + len(msg.recipients_bcc)

        all_recips = msg.recipients_to + msg.recipients_cc + msg.recipients_bcc
        n_recips = len(all_recips)
        s["recipients_per_email"].append(n_recips)

        if n_recips > broadcast_threshold:
            s["broadcast_count"] += 1

        # reply-all: Re: subject + many recipients
        if msg.subject.lower().startswith("re:") and n_recips > 3:
            s["reply_all_count"] += 1

    # build results for each node
    results = []

    for node in graph.nodes():
        s = stats_by_sender.get(node, {
            "total_sent": 0, "total_cc_bcc": 0,
            "broadcast_count": 0, "reply_all_count": 0,
            "recipients_per_email": [],
        })

        sent = s["total_sent"]

        if sent == 0:
            results.append({
                "id": node,
                "name": graph.nodes[node].get("name", node),
                "waste_score": 0,
                "overproduction": 0,
                "broadcast_ratio": 0,
                "reply_all_ratio": 0,
                "orphan_ratio": 0,
            })
            continue

        overprod = s["total_cc_bcc"] / sent
        broadcast = s["broadcast_count"] / sent
        reply_all = s["reply_all_count"] / sent

        # orphan ratio: sent to someone who never replied
        out_nbrs = set(graph.successors(node))
        orphans = sum(1 for n in out_nbrs if not graph.has_edge(n, node))
        orphan = orphans / len(out_nbrs) if out_nbrs else 0

        # normalize overproduction (cap at 10)
        norm_overprod = min(overprod / 10, 1.0)

        # combined score 0-100
        waste = (
            0.3 * norm_overprod
            + 0.3 * broadcast
            + 0.2 * reply_all
            + 0.2 * orphan
        ) * 100

        results.append({
            "id": node,
            "name": graph.nodes[node].get("name", node),
            "waste_score": round(waste, 1),
            "overproduction": round(overprod, 2),
            "broadcast_ratio": round(broadcast, 3),
            "reply_all_ratio": round(reply_all, 3),
            "orphan_ratio": round(orphan, 3),
        })

    results.sort(key=lambda x: x["waste_score"], reverse=True)
    return results
