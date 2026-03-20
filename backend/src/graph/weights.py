"""Compute edge weights for the communication graph."""

from datetime import datetime, timezone

import networkx as nx
import numpy as np


def compute_weights(
    graph: nx.DiGraph,
    alpha: float = 0.4,  # frequency weight
    beta: float = 0.2,   # recency weight
    gamma: float = 0.2,  # sentiment weight (enriched later)
    delta: float = 0.2,  # response efficiency (enriched later)
    reference_date: datetime | None = None,
    decay_days: float = 180.0,
) -> nx.DiGraph:
    """Compute composite edge weights.

    Formula: w(i→j) = α·freq + β·recency + γ·sentiment + δ·response_eff

    Sentiment and response_eff default to 0.5 (neutral) until enriched later.
    """
    if graph.number_of_edges() == 0:
        return graph

    # figure out reference date if not provided
    if reference_date is None:
        latest = None
        for _, _, edge_data in graph.edges(data=True):
            last_dt = edge_data.get("last_email")
            if last_dt and (latest is None or last_dt > latest):
                latest = last_dt
        reference_date = latest if latest else datetime.now(timezone.utc)

    # make it timezone-aware if needed
    if reference_date.tzinfo is None:
        reference_date = reference_date.replace(tzinfo=timezone.utc)

    # grab raw values
    freqs = []
    recency_vals = []

    for _, _, edge_data in graph.edges(data=True):
        freqs.append(edge_data.get("email_count", 1))

        last_dt = edge_data.get("last_email")
        if last_dt:
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            days_ago = (reference_date - last_dt).total_seconds() / 86400
            recency = np.exp(-days_ago / decay_days)
        else:
            recency = 0.5  # no date info, neutral fallback
        recency_vals.append(recency)

    # normalize frequency to [0,1]
    freq_arr = np.array(freqs, dtype=float)
    max_freq = freq_arr.max()
    if max_freq > 0:
        norm_freq = freq_arr / max_freq
    else:
        norm_freq = np.zeros_like(freq_arr)

    norm_recency = np.array(recency_vals, dtype=float)

    # compute composite weights for each edge
    for idx, (src, tgt, edge_data) in enumerate(graph.edges(data=True)):
        sentiment = edge_data.get("sentiment", 0.5)
        response_eff = edge_data.get("response_efficiency", 0.5)

        w = (
            alpha * norm_freq[idx]
            + beta * norm_recency[idx]
            + gamma * sentiment
            + delta * response_eff
        )

        edge_data["weight"] = float(w)
        edge_data["norm_frequency"] = float(norm_freq[idx])
        edge_data["norm_recency"] = float(norm_recency[idx])

    return graph
