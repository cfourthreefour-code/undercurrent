
# 🌊 Undercurrent

### AI-Powered Organizational Intelligence Platform

**Graph-based diagnostics from email communication. Instant, objective, data-driven.**

Traditional organizational health assessments take months, cost $500k+, and are obsolete by the time the PDF hits your inbox. **Undercurrent** replaces surveys with math. By analyzing the "digital exhaust" of an organization—email metadata and sentiment—it builds a living map of how work actually gets done.

[**Explore the Demo**] | [**Read the Architecture**] | [**View Documentation**]

---

## 🚀 Key Capabilities

Undercurrent doesn't just count emails; it applies network science to uncover hidden organizational dynamics.

- **🕸️ Communication Graph** — Interactive force-directed visualization of real-world interactions. See the "shadow org chart."
    
- **💀 Critical People Detection** — "Dead-Man-Switch" scoring identifies individuals who hold disproportionate structural power (and represent a massive flight risk).
    
- **groups Community Detection** — Uses **Louvain clustering** to identify functional silos and cross-departmental "bridge" players.
    
- **📉 Communication Waste** — Quantifies the "Cost of Noise": broadcast storms, reply-all abuse, and orphan threads.
    
- **🤖 Org Health AI (GraphRAG)** — A natural language interface to your org. Ask: _"Who are the main bottlenecks in the Enron legal team?"_ or _"Is the engineering department siloed from product?"_
    

---

## 🛠️ The Tech Stack

|**Layer**|**Technology**|
|---|---|
|**Graph Engine**|NetworkX 3.x (Centrality, Betweenness, Louvain)|
|**Intelligence**|OpenAI GPT-5, text-embedding-3-large|
|**Vector Store**|ChromaDB (Local-first)|
|**API Framework**|FastAPI + Pydantic v2|
|**Frontend**|Next.js 15 (App Router), Tailwind CSS|
|**Visualization**|`react-force-graph-2d` (Canvas-based rendering)|
|**Package Mgmt**|`uv` (Python), `pnpm` (Node)|

---

## 🏗️ How the Pipeline Works

Undercurrent processes data in a strictly linear, reproducible pipeline designed for speed.

1. **Ingestion**: Unpacks the Enron corpus (or custom maildir).
    
2. **Graph Construction**: Builds a directed, weighted graph where edges represent frequency and recency.
    
3. **Sentiment Enrichment**: Applies TextBlob analysis to edge weights to detect friction or high-positivity hubs.
    
4. **Metric Calculation**: Runs PageRank, Betweenness Centrality, and Eigenvector metrics.
    
5. **RAG Indexing**: Seeds ChromaDB with email subjects and graph summaries for the LLM context window.
    

---

## ⚡ Quick Start

### 1. Prerequisites

Ensure you have [uv](https://docs.astral.sh/uv/) and [pnpm](https://pnpm.io/) installed.

### 2. Installation

Bash

```
# Clone and enter
git clone https://github.com/your-username/undercurrent.git
cd undercurrent

# Setup Backend
cd backend
cp .env.example .env  # Add your OPENAI_API_KEY
uv sync
uv run python -m src.pipeline  # Processes Enron dataset (~5 min)
uv run uvicorn src.api.main:app --reload

# Setup Frontend (New Terminal)
cd web-app
pnpm install
pnpm dev
```

---

## 📂 Project Structure

Plaintext

```
undercurrent/
├── backend/
│   ├── src/
│   │   ├── graph/      # NetworkX logic & Centrality metrics
│   │   ├── rag/        # GraphRAG & Vector search
│   │   └── pipeline.py # Data orchestration
├── web-app/
│   ├── src/app/        # Dashboard & Visualization routes
│   └── src/components/ # Interactive Graph & Chat UI
└── docs/               # Technical deep-dives
```

---

## 📊 Demo Dataset: The Enron Corpus

Undercurrent ships with support for the **Enron Email Dataset** (520,000+ emails). It is the only large-scale, public corporate dataset that allows for the testing of "Dead-Man-Switch" scoring and bottleneck analysis in a real-world (if infamous) corporate environment.

