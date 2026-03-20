# Undercurrent — AI-Powered Organizational Intelligence Platform

**Graph-based diagnostics from email communication data. Instant, objective, data-driven.**

Companies pay McKinsey $500K+ for organizational health assessments that take months, are based on surveys, and are obsolete by the time they land. I built Undercurrent to replace that entire workflow with math and AI — plug in email data, get a complete communication graph, critical people scores, bottleneck analysis, and an AI you can interrogate about your org in plain English. Minutes, not months.

## What it does

- **Communication Graph** — Interactive force-directed visualization of who talks to whom, how often, and with what sentiment
- **Critical People Detection** — Dead-Man-Switch scoring: who would cripple the org if they left tomorrow?
- **Community Detection** — Discovers the real org structure vs. the official chart using Louvain clustering
- **Communication Waste** — Quantifies overproduction, broadcast storms, orphan threads, and reply-all abuse
- **Org Health Score** — 0–100 score with sub-scores for connectivity, bottleneck risk, siloing, and efficiency
- **AI Q&A (GraphRAG)** — Ask natural language questions about the org, backed by graph metrics + email context
- **Automated Reports** — GPT-5 generated diagnostic reports with data-backed recommendations

## Tech stack

| Layer | Technology |
|---|---|
| Graph computation | NetworkX 3.x |
| Backend API | FastAPI |
| Sentiment analysis | TextBlob |
| Vector store | ChromaDB |
| Embeddings | OpenAI text-embedding-3-large |
| LLM | OpenAI GPT-5 |
| Frontend | Next.js (App Router) |
| Graph visualization | react-force-graph-2d |
| Styling | Tailwind CSS |

## Quick start

### Prerequisites

- Python 3.12+, [uv](https://docs.astral.sh/uv/)
- Node.js 20+, [pnpm](https://pnpm.io/)
- OpenAI API key

### Setup

```bash
# Clone
git clone <repo-url> && cd undercurrent

# Environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Backend — run the data pipeline first, then start the API
cd backend
uv sync
uv run python -m src.pipeline          # ~5 min on Enron corpus
uv run uvicorn src.api.main:app --reload --port 8000

# Frontend (new terminal)
cd web-app
pnpm install
pnpm dev    # http://localhost:3000
```

### Demo dataset

I'm using the Enron email corpus (520K emails, ~150 active employees) — the only large-scale, publicly available corporate email dataset. The upload flow in the app simulates a plug-and-play experience while serving pre-computed Enron analytics in the background.

## Project structure

```
undercurrent/
├── backend/
│   ├── src/
│   │   ├── parser/      # Email parsing & Enron extraction
│   │   ├── graph/       # NetworkX graph construction & edge weights
│   │   ├── metrics/     # Centrality, communities, dead-man-switch, waste, health
│   │   ├── sentiment/   # TextBlob sentiment enrichment
│   │   ├── rag/         # GraphRAG: embeddings, retrieval, LLM prompts
│   │   ├── analysis/    # Role inference from email subjects
│   │   ├── api/         # FastAPI routes
│   │   └── pipeline.py  # Orchestrates the full pipeline
│   └── tests/
├── web-app/
│   └── src/
│       ├── app/         # Next.js pages: graph, people, trends, risks, reports
│       ├── components/  # TopNav, ChatDrawer, PersonPanel, shader background
│       └── lib/         # API client, TypeScript types
├── docs/                # Architecture diagrams, pitch notes, demo scripts
└── data/                # Enron dataset (gitignored)
```

## How the pipeline works

1. **Extract** — unpack the Enron maildir archive
2. **Parse** — extract sender, recipients, subject, body, dates from raw email files
3. **Build graph** — directed weighted graph: nodes = people, edges = email volume + recency
4. **Sentiment** — TextBlob sentiment per email, averaged onto edges and nodes
5. **Metrics** — PageRank, betweenness, eigenvector centrality; Louvain community detection; Dead-Man-Switch scores; waste analysis; org health scoring
6. **RAG** — embed email subjects + graph summaries into ChromaDB for retrieval
7. **Export** — write `graph.json`, `metrics.json`, `communities.json`, per-person JSONs to `output/`

The API reads everything from disk at startup — no database, no ORM, no migrations.

## Running tests

```bash
cd backend
uv run python -m pytest tests/ -v
```

RAG tests are skipped unless `OPENAI_API_KEY` is set and ChromaDB is populated.

## License

MIT
