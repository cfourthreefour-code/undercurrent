"""Report generation endpoints."""

import json
from pathlib import Path

from fastapi import APIRouter
from openai import OpenAI

from src.rag.prompts import build_report_messages
from src.rag.retriever import retrieve_context

router = APIRouter(prefix="/api/reports", tags=["reports"])

_cache: dict[str, list[dict]] = {}
OUT_DIR = Path(__file__).resolve().parents[3] / "output"


@router.get("/health")
async def health_report():
    """Generate full org health report via LLM. Cached after first run."""
    if "health" in _cache:
        return {"report": _cache["health"]}

    # build comprehensive context
    ctx = retrieve_context(
        "Generate a comprehensive organizational health report covering critical personnel, "
        "communication bottlenecks, community structure, waste analysis, and recommendations."
    )

    # load full metrics for richer data
    with open(OUT_DIR / "metrics.json") as f:
        mdata = json.load(f)

    extra = "\n\n## Full Metrics Data\n"
    extra += f"Health Score: {mdata['health']['health_score']}/100\n"
    extra += f"Grade: {mdata['health']['grade']}\n"
    extra += f"Sub-scores: {json.dumps(mdata['health']['sub_scores'])}\n"
    extra += f"Stats: {json.dumps(mdata['health']['stats'])}\n"

    extra += "\n### Top 20 Critical People (Dead-Man-Switch)\n"
    for d in mdata.get("dead_man_switch", []):
        extra += f"- {d['name']}: score={d['dms_score']}, betweenness={d['betweenness']}, impact={d['impact_pct']}%\n"

    extra += "\n### Top 20 Communication Waste\n"
    for w in mdata.get("waste", []):
        extra += f"- {w['name']}: waste={w['waste_score']}, broadcast={w['broadcast_ratio']}, orphan={w['orphan_ratio']}\n"

    extra += "\n### Sentiment Summary\n"
    extra += json.dumps(mdata.get("sentiment", {}), indent=2)

    msgs = build_report_messages(ctx + extra)

    oai = OpenAI()
    resp = oai.chat.completions.create(
        model="gpt-4.1",
        messages=msgs,
        temperature=0.3,
        max_tokens=4000,
    )

    text = resp.choices[0].message.content

    # parse into sections
    sections = []
    title = "Executive Summary"
    lines = []

    for ln in text.split("\n"):
        if ln.startswith("## ") or ln.startswith("# "):
            if lines:
                sections.append({"title": title, "content": "\n".join(lines).strip()})
            title = ln.lstrip("#").strip()
            lines = []
        else:
            lines.append(ln)

    if lines:
        sections.append({"title": title, "content": "\n".join(lines).strip()})

    # filter empty
    sections = [s for s in sections if s["content"]]

    _cache["health"] = sections
    return {"report": sections}
