# Undercurrent — Pitch Guide

Notes for pitching this thing. Adjust tone based on audience.

## 60-Second Elevator Pitch

> Companies spend over **$50 billion annually** on management consulting, and a huge chunk of that goes to organizational health assessments — the kind McKinsey charges half a million dollars for. These engagements take months, rely on subjective surveys, and are outdated the moment they're delivered.
>
> **Undercurrent changes that.** It plugs into a company's email data and instantly builds a communication graph — who talks to whom, how often, with what sentiment. From that graph, it computes real organizational intelligence: who are the critical people you can't afford to lose? Where are the bottlenecks? What does the real org structure look like versus the official one? Where is communication waste happening?
>
> And then there's the AI layer. You can ask natural language questions — "What would happen if your VP of Trading left?" — and get data-backed answers powered by GraphRAG, combining graph analytics with GPT-5.
>
> I'm not replacing consultants with surveys. I'm replacing them with **math and AI**.

## Problem

- **$500K+ per engagement** for organizational health assessments (McKinsey, BCG, Deloitte)
- **3-6 months** to deliver results
- **Subjective** — based on surveys and interviews, not actual behavior
- **Outdated immediately** — org dynamics change daily, reports are static snapshots
- **No continuous monitoring** — one-time assessments, no ongoing intelligence

## Solution

Undercurrent is a **plug-and-play platform** that:
1. Ingests email communication data (Exchange, Gmail, IMAP, or file upload)
2. Builds a weighted communication graph (nodes = people, edges = relationships)
3. Computes graph-based metrics (centrality, communities, critical nodes, waste)
4. Provides an interactive visual explorer
5. Offers AI-powered Q&A about the organization (GraphRAG)
6. Generates automated diagnostic reports

**Time to insight: minutes, not months. Cost: SaaS subscription, not consulting retainer.**

## Market

| Segment | Size |
|---------|------|
| **TAM** — Global management consulting | $350B |
| **SAM** — Organizational health & people analytics | $50B |
| **SOM** — Mid-to-large enterprises, initial markets | $5B |

## Competitive Positioning

| | McKinsey OHI | Microsoft Viva | Undercurrent |
|--|-------------|---------------|-----------|
| Data source | Surveys | M365 signals | Email graph |
| Time to insight | 3-6 months | Weeks | Minutes |
| Cost | $500K+ | $6/user/mo | $2/user/mo |
| Objectivity | Subjective | Partial | Fully data-driven |
| AI Q&A | No | Basic Copilot | GraphRAG |
| Graph analytics | No | No | Full suite |
| Continuous monitoring | No | Yes | Yes |
| Privacy-first | No | Vendor lock-in | Self-hosted option |

## Competitive Moat

1. **Proprietary graph algorithms** — Dead-Man-Switch scoring, communication waste detection, and org health scoring are novel combinations not available elsewhere
2. **Data network effects** — More organizations → better benchmarks → more valuable insights
3. **GraphRAG** — Combining graph-structured organizational data with LLM reasoning is a fundamentally new approach to organizational intelligence
4. **Speed advantage** — First mover in graph-based org analytics at this price point

## Demo Walkthrough

1. **Upload** — Drag and drop email export → watch processing animation (parsing → graph building → analyzing)
2. **Dashboard** — Org health score (62/100, grade C+), key metrics at a glance, top critical people
3. **Graph Explorer** — Interactive force-directed graph, 150 nodes colored by community, click to explore
4. **People Deep-Dive** — Click a critical person → see their metrics, connections, ego network, impact score
5. **Ask AI** — "Who are the biggest bottlenecks?" → streaming response with specific names and data
6. **Report** — One-click generated report with executive summary, risks, and recommendations

## Key Talking Points

- "Every company has an official org chart and a real org chart. Undercurrent shows you the real one."
- "I found that removing one person from Enron's network would disconnect 23% of all communication paths."
- "Traditional consulting tells you what people say. This analyzes what people actually do."
- "Think of it as an MRI for your organization — non-invasive, objective, and immediate."
