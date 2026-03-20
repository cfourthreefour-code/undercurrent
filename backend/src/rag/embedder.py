"""Email chunking and ChromaDB embedding."""

import hashlib
from pathlib import Path

import chromadb
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from src.parser.email_parser import ParsedEmail


CHROMA_DIR = Path(__file__).resolve().parents[2] / "chroma_data"
COLLECTION_NAME = "enron_emails"


def get_chroma_client() -> chromadb.PersistentClient:
    """Get persistent chroma client."""
    return chromadb.PersistentClient(path=str(CHROMA_DIR))


def chunk_email(msg: ParsedEmail, max_chars: int = 2000) -> str:
    """Turn email into embeddable text chunk."""
    text = f"From: {msg.sender}\nSubject: {msg.subject}\n\n{msg.body}"
    return text[:max_chars]


def content_hash(text: str) -> str:
    """MD5 hash for dedup."""
    return hashlib.md5(text.encode()).hexdigest()


def embed_emails(
    emails: list[ParsedEmail],
    communities: dict | None = None,
    batch_size: int = 100,
    progress: bool = True,
):
    """Embed emails into ChromaDB collection."""
    oai = OpenAI()
    chroma = get_chroma_client()

    # nuke existing collection and start fresh
    try:
        chroma.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    coll = chroma.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    partition = communities.get("partition", {}) if communities else {}

    # dedupe by content hash
    seen: set[str] = set()
    unique = []

    for msg in emails:
        chunk = chunk_email(msg)
        h = content_hash(chunk)
        if h not in seen and len(chunk.strip()) > 50:
            seen.add(h)
            unique.append((msg, chunk))

    if progress:
        print(f"  Embedding {len(unique)} unique emails (deduplicated from {len(emails)})...")

    # batch process
    for i in range(0, len(unique), batch_size):
        batch = unique[i:i + batch_size]
        texts = [chunk for _, chunk in batch]
        ids = [f"email_{i + j}" for j in range(len(batch))]

        # get embeddings
        resp = oai.embeddings.create(
            model="text-embedding-3-large",
            input=texts,
        )
        embeds = [item.embedding for item in resp.data]

        # build metadata
        metas = []
        for msg, _ in batch:
            metas.append({
                "sender": msg.sender,
                "recipients": ", ".join(msg.recipients_to[:5]),
                "subject": msg.subject[:200],
                "date": msg.date.isoformat() if msg.date else "",
                "community_id": str(partition.get(msg.sender, -1)),
            })

        coll.add(
            ids=ids,
            embeddings=embeds,
            documents=texts,
            metadatas=metas,
        )

        if progress and (i + batch_size) % 1000 == 0:
            print(f"    Embedded {min(i + batch_size, len(unique))}/{len(unique)}...")

    if progress:
        print(f"  Embedding complete: {coll.count()} documents in ChromaDB")

    return coll
