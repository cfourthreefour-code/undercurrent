"""ChromaDB querying and LLM context building."""

import json
from pathlib import Path

import chromadb
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from src.rag.embedder import CHROMA_DIR, COLLECTION_NAME


OUTPUT_DIR = Path(__file__).resolve().parents[2] / "output"


def get_collection():
    """Get chroma collection, or None if unavailable."""
    try:
        chroma = chromadb.PersistentClient(path=str(CHROMA_DIR))
        return chroma.get_collection(name=COLLECTION_NAME)
    except Exception:
        return None


def load_graph_data():
    """Load graph.json."""
    with open(OUTPUT_DIR / "graph.json") as f:
        return json.load(f)


def load_metrics_data():
    """Load metrics.json."""
    with open(OUTPUT_DIR / "metrics.json") as f:
        return json.load(f)


def load_communities_data():
    """Load communities.json."""
    with open(OUTPUT_DIR / "communities.json") as f:
        return json.load(f)


def extract_mentioned_people(q: str, graph: dict) -> list[dict]:
    """Find people mentioned in the question."""
    q_lower = q.lower()
    found = []

    for node in graph["nodes"]:
        name = node.get("name", "").lower()
        if len(name) > 3 and name in q_lower:
            found.append(node)

    return found


def retrieve_context(q: str, top_k: int = 15) -> str:
    """Build context for LLM from emails + graph + metrics."""
    oai = OpenAI()
    coll = get_collection()
    graph = load_graph_data()
    metrics = load_metrics_data()

    # 1. email chunks from chroma
    email_ctx = "## Relevant Emails\n\n"

    if coll is not None:
        q_resp = oai.embeddings.create(
            model="text-embedding-3-large",
            input=[q],
        )
        q_emb = q_resp.data[0].embedding

        results = coll.query(
            query_embeddings=[q_emb],
            n_results=top_k,
        )

        if results["documents"] and results["documents"][0]:
            for i, (doc, meta) in enumerate(zip(results["documents"][0], results["metadatas"][0])):
                email_ctx += f"**Email {i+1}** (From: {meta.get('sender', 'unknown')}, "
                email_ctx += f"Date: {meta.get('date', 'unknown')}, "
                email_ctx += f"Subject: {meta.get('subject', '')})\n"
                email_ctx += f"{doc[:500]}\n\n"
    else:
        email_ctx += "(Email search unavailable — ChromaDB not configured)\n\n"

    # 2. graph context for mentioned people
    found = extract_mentioned_people(q, graph)
    people_ctx = ""

    if found:
        people_ctx = "## Graph Context for Mentioned People\n\n"
        for person in found[:5]:
            people_ctx += f"**{person['name']}** ({person['email']})\n"
            people_ctx += f"- Community: {person.get('community_id', 'N/A')}\n"
            people_ctx += f"- PageRank: {person.get('pagerank', 0):.6f}\n"
            people_ctx += f"- Betweenness Centrality: {person.get('betweenness', 0):.6f}\n"
            people_ctx += f"- Eigenvector Centrality: {person.get('eigenvector', 0):.6f}\n"
            people_ctx += f"- Emails Sent: {person.get('total_sent', 0)}\n"
            people_ctx += f"- Emails Received: {person.get('total_received', 0)}\n"
            people_ctx += f"- Avg Sent Sentiment: {person.get('avg_sent_sentiment', 0):.4f}\n"
            people_ctx += f"- Avg Received Sentiment: {person.get('avg_received_sentiment', 0):.4f}\n\n"

    # 3. org overview
    health = metrics.get("health", {})
    top_dms = metrics.get("dead_man_switch", [])[:5]
    top_waste = metrics.get("waste", [])[:5]

    org_ctx = "## Organization Overview\n\n"
    org_ctx += f"- Health Score: {health.get('health_score', 'N/A')}/100 (Grade: {health.get('grade', 'N/A')})\n"

    sub = health.get("sub_scores", {})
    org_ctx += f"- Connectivity: {sub.get('connectivity', 'N/A')}/100\n"
    org_ctx += f"- Bottleneck Risk: {sub.get('bottleneck_risk', 'N/A')}/100\n"
    org_ctx += f"- Silo Score: {sub.get('silo_score', 'N/A')}/100\n"
    org_ctx += f"- Efficiency: {sub.get('efficiency', 'N/A')}/100\n"

    stats = health.get("stats", {})
    org_ctx += f"- Total People: {stats.get('node_count', 'N/A')}\n"
    org_ctx += f"- Total Relationships: {stats.get('edge_count', 'N/A')}\n"
    org_ctx += f"- Communities: {stats.get('communities_count', 'N/A')}\n"

    org_ctx += f"\n**Most Critical People (Dead-Man-Switch):**\n"
    for d in top_dms:
        org_ctx += f"- {d['name']}: DMS Score {d['dms_score']}, Impact {d['impact_pct']}%\n"

    org_ctx += f"\n**Biggest Communication Waste:**\n"
    for w in top_waste:
        org_ctx += f"- {w['name']}: Waste Score {w['waste_score']}\n"

    # combine
    full_ctx = email_ctx + "\n" + people_ctx + "\n" + org_ctx
    return full_ctx
