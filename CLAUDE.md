# Undercurrent — Feature Sprint

## What This Project Is
AI-powered organizational intelligence platform. Analyzes email communication data to produce graph-based diagnostics — communication maps, critical people detection, community discovery, waste analysis, health scoring, GraphRAG Q&A, and automated reports. Uses the Enron email corpus (520K emails, 150 employees) as demo dataset.

## Current Tech Stack
- **Backend:** Python, FastAPI, NetworkX, ChromaDB, OpenAI API
- **Frontend:** Next.js, React, TypeScript
- **Backend structure:** backend/src/ with subdirectories: parser/, graph/, sentiment/, metrics/, rag/, api/
- **Frontend structure:** web-app/src/ with subdirectories: lib/, components/, app/
- **Pipeline orchestrator:** backend/src/pipeline.py

## Current State
The platform is fully working with:
- Force-directed graph visualization (interactive, colour-coded by community, sized by centrality)
- Clickable nodes that open a right-side detail panel (Role Snapshot, Workstreams, Communication Health, Influence & Flow, Recent Changes, Comparisons)
- Top nav: People, Trends, Risks, Report
- Search bar (top-left)
- Org Health Score (0-100)
- Community detection (Louvain clustering)
- Dead-Man-Switch critical people scoring
- Communication waste quantification
- AI Q&A via GraphRAG
- Automated GPT-generated diagnostic reports

## The Current Task
Building 3 new features to strengthen the platform's commercial positioning. These features ADD to the existing platform — they do not replace or modify existing working features.

### Feature 1: "What If?" Key Person Departure Simulator
Click any node on the graph → see what happens to the network if that person leaves. Before/after health score, affected communities, new bottlenecks, orphaned nodes.

### Feature 2: Collaborative Tax Calculator
Translate communication waste into estimated annual dollar cost. User inputs avg hourly rate, system multiplies waste hours × cost. Headline number + category breakdown.

### Feature 3: Pricing & Positioning Page
Static page showing market positioning, three pricing tiers, McKinsey comparison table. Demonstrates commercial thinking, not just technical ability.

## Critical Rules for Feature Work

### 1. DO NOT BREAK EXISTING FUNCTIONALITY
- All existing pages, endpoints, and features must continue working exactly as they do now.
- New features should be additive — new components, new API endpoints, new pages.
- If you need to modify an existing file (e.g., adding a button to the graph page), make the smallest possible change.
- Test that existing functionality still works after any modification to shared files.

### 2. Follow Existing Patterns
- Match the code style already in the codebase — the casual, hand-written feel with short comments.
- Use the same component patterns, import styles, and API conventions already established.
- New API endpoints go in backend/src/api/ following the existing router pattern.
- New frontend components go in web-app/src/components/ following existing conventions.
- New pages go in web-app/src/app/ following the Next.js app router pattern.

### 3. Feature Implementation Approach
- Plan before coding. For each feature, outline the components, endpoints, and data flow BEFORE writing code.
- Build incrementally. Get a minimal version working first, then enhance.
- After completing each feature, verify the existing graph page still loads and functions correctly.

### 4. Code Style
- Comments: casual, short, occasionally sarcastic — match the existing voice
- No over-engineering. These features should be lean and functional, not enterprise-architected.
- Prefer simple, readable code over clever abstractions
- F-strings for formatting
- Early returns over deep nesting

## Do Not Touch
- .env and .env.example
- data/ directory
- Any API keys, secrets, or credentials
- The Enron dataset processing logic's mathematical formulas
- Existing graph algorithms, metric calculations, or scoring formulas
- Existing API endpoint paths, request/response shapes, or data schemas
