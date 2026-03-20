"""RAG module tests — openai/chroma tests skipped if not configured."""

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

needs_openai = pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set",
)
needs_chroma = pytest.mark.skipif(
    not (Path(__file__).resolve().parents[1] / "chroma_data").exists(),
    reason="ChromaDB not populated",
)


class TestPrompts:
    def test_chat_messages(self):
        from src.rag.prompts import build_chat_messages
        msgs = build_chat_messages("Who is important?", "context here")
        assert len(msgs) == 2
        assert msgs[0]["role"] == "system"
        assert msgs[1]["role"] == "user"
        assert "context here" in msgs[1]["content"]

    def test_chat_with_history(self):
        from src.rag.prompts import build_chat_messages
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"},
        ]
        msgs = build_chat_messages("Follow up", "context", hist=history)
        assert len(msgs) == 4  # system + history + user

    def test_report_messages(self):
        from src.rag.prompts import build_report_messages
        msgs = build_report_messages("org data here")
        assert len(msgs) == 2
        assert msgs[0]["role"] == "system"
        assert "diagnostic report" in msgs[0]["content"].lower()


@needs_openai
@needs_chroma
class TestRetriever:
    def test_retrieve(self):
        from src.rag.retriever import retrieve_context
        ctx = retrieve_context("Who communicates the most?")
        assert len(ctx) > 100
        assert "Relevant Emails" in ctx
        assert "Organization Overview" in ctx

    def test_mentioned_people(self):
        from src.rag.retriever import extract_mentioned_people, load_graph_data
        gdata = load_graph_data()
        mentioned = extract_mentioned_people("Tell me about Sally Beck", gdata)
        assert len(mentioned) > 0
