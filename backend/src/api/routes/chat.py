"""Chat endpoint — SSE streaming response."""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from openai import OpenAI

from src.api.schemas import ChatRequest
from src.rag.prompts import build_chat_messages
from src.rag.retriever import retrieve_context

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
async def chat(req: ChatRequest):
    """Q&A with streaming SSE. Uses GraphRAG for context."""
    ctx = retrieve_context(req.message)
    msgs = build_chat_messages(q=req.message, ctx=ctx, hist=req.history)

    oai = OpenAI()

    def stream_chunks():
        resp = oai.chat.completions.create(
            model="gpt-5.2",
            messages=msgs,
            stream=True,
            temperature=0.3,
            max_completion_tokens=2000,
        )
        for chunk in resp:
            delta = chunk.choices[0].delta.content
            if delta:
                yield f"data: {json.dumps({'content': delta})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_chunks(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
