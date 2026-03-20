# Undercurrent — 60-Second Technical Video Script

Script for a technical deep-dive aimed at developers or technical buyers.

## Setup
- Screen recording alternating between architecture diagrams, code, and the running app
- Terminal visible for pipeline execution
- Background music: ambient electronic (low volume)
- Voiceover: technical but accessible

---

## Script

### 0:00–0:10 — Architecture Overview
**[Mermaid system architecture diagram renders on screen]**
> Voiceover: "Undercurrent is a full-stack platform built on graph theory and AI. The backend runs a Python data pipeline — FastAPI serving NetworkX graph analytics — while the frontend is a Next.js app with real-time force-directed graph visualization."
> [Highlight key components: NetworkX, FastAPI, ChromaDB, GPT-5, Next.js]

### 0:10–0:20 — Data Pipeline
**[Terminal showing pipeline execution with progress bars]**
> Voiceover: "It starts with raw email data — in this case, the Enron corpus: 520,000 emails from 150 employees. The pipeline parses emails, normalizes addresses, filters duplicates, and extracts structured communication records."
> [Show parsed email count, sample output]
> Voiceover: "From these records, it builds a weighted directed graph — one node per person, edges weighted by frequency, recency, sentiment, and response time."

### 0:20–0:35 — Graph Algorithms
**[Split screen: code on left, visualized graph on right]**
> Voiceover: "The real power is in the graph algorithms. The system computes four centrality measures — degree, betweenness, eigenvector, and PageRank — to identify influence from different angles."
> [Highlight nodes lighting up by centrality]
> Voiceover: "Louvain community detection reveals the real organizational structure. The Dead-Man-Switch algorithm scores how critical each person is by combining betweenness centrality with path redundancy analysis."
> [Show DMS formula overlay]
> Voiceover: "It also detects communication waste — broadcast storms, orphan emails, over-CC'ing — quantified per person."

### 0:35–0:50 — GraphRAG Pipeline
**[Diagram: emails → chunks → embeddings → ChromaDB → retrieval → LLM]**
> Voiceover: "For the AI layer, I built a GraphRAG pipeline. Emails are chunked and embedded using OpenAI's text-embedding-3-large, stored in ChromaDB. When you ask a question, it retrieves relevant emails AND pulls graph context — the person's centrality scores, community membership, connections."
> [Show composite context being assembled]
> Voiceover: "This combined context goes to GPT-5, which streams a response grounded in actual organizational data — not hallucinations."
> [Show streaming chat response in the app]

### 0:50–1:00 — Scale & Future
**[Architecture diagram transitions to production vision with Kubernetes, Kafka, Neo4j]**
> Voiceover: "Today this runs on a single machine analyzing 150 people. The production architecture scales to millions of employees with Neo4j, Kafka, and distributed graph computation. The vision: fine-tuned local LLMs for complete data privacy, temporal anomaly detection, and predictive attrition modeling."
> [Fade to Undercurrent logo]
> Text: "Built with Python, NetworkX, FastAPI, ChromaDB, GPT-5, Next.js, and react-force-graph"
