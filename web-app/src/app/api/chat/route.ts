import { promises as fs } from "node:fs";
import path from "node:path";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAT_SYSTEM_PROMPT = `You are an organizational intelligence analyst for a company. You have access to detailed email communication data and graph-based metrics computed from that data.

Your role is to answer questions about the organization's communication patterns, structure, and health using specific data points from the provided context.

Key guidelines:
- Always cite specific metrics, names, and numbers from the context
- If asked about a person, reference their centrality scores, community, sentiment, and connections
- If asked about organizational issues, reference the health score, bottleneck risk, silo scores
- Be direct and analytical — this is a business intelligence tool, not a chatbot
- Format responses with markdown for readability (headers, bold, bullet points)
- If the context doesn't contain enough information to answer, say so clearly
- Never make up data — only reference what's in the provided context
- When citing a metric, briefly explain how it is computed:
  - **PageRank**: Iterative eigenvector-based importance measure (damping factor 0.85) — higher values indicate nodes receiving links from other important nodes
  - **Betweenness centrality**: Fraction of all shortest paths that pass through a node — C_B(v) = Σ (σ_st(v) / σ_st) for all s≠v≠t
  - **Eigenvector centrality**: Proportional to the sum of centralities of a node's neighbors
  - **Dead-Man-Switch score**: Composite of betweenness, eigenvector, and inverse redundancy — measures how much the network degrades if a node is removed
  - **Community detection**: Louvain algorithm maximizing modularity Q = (1/2m) Σ [A_ij - k_i·k_j/2m] δ(c_i, c_j)
  - **Sentiment**: TextBlob polarity score (−1 to +1) computed from email body text

The data comes from analyzing the company's email communication using graph theory (NetworkX), computing centrality measures (PageRank, betweenness, eigenvector), community detection (Louvain), critical node analysis (Dead-Man-Switch scoring), communication waste detection, and sentiment analysis (TextBlob).

Data source: 121,543 parsed emails from Enron maildir across 4,555 senders and 11,661 edges, spanning approximately 1998–2002.`;

type GraphNode = {
  id: string;
  name?: string;
  email?: string;
  community_id?: number | null;
  pagerank?: number;
  betweenness?: number;
  eigenvector?: number;
  total_sent?: number;
  total_received?: number;
  avg_sent_sentiment?: number;
  avg_received_sentiment?: number;
};

type CtxData = {
  graph: { nodes: GraphNode[] };
  overview: {
    health?: {
      health_score?: number | string;
      grade?: string;
      sub_scores?: {
        connectivity?: number;
        bottleneck_risk?: number;
        silo_score?: number;
        efficiency?: number;
      };
      stats?: {
        node_count?: number;
        edge_count?: number;
        communities_count?: number;
      };
    };
  };
  dms: { rankings?: Array<{ name: string; dms_score: number; impact_pct: number }> };
  waste: { people?: Array<{ name: string; waste_score: number }> };
};

let _ctxData: CtxData | null = null;

async function loadCtxData(): Promise<CtxData> {
  if (_ctxData) return _ctxData;
  const dir = path.join(process.cwd(), "public", "data");
  const [graph, overview, dms, waste] = await Promise.all([
    fs.readFile(path.join(dir, "graph.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(dir, "metrics", "overview.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(dir, "metrics", "dead-man-switch.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(dir, "metrics", "waste.json"), "utf8").then(JSON.parse),
  ]);
  _ctxData = { graph, overview, dms, waste };
  return _ctxData;
}

function buildContext(question: string, d: CtxData): string {
  const emailCtx = "## Relevant Emails\n\n(Email evidence unavailable in this deployment)\n\n";

  const qLower = question.toLowerCase();
  const mentioned = d.graph.nodes
    .filter((n) => {
      const name = (n.name || "").toLowerCase();
      return name.length > 3 && qLower.includes(name);
    })
    .slice(0, 5);

  let peopleCtx = "";
  if (mentioned.length > 0) {
    peopleCtx = "## Graph Context for Mentioned People\n\n";
    for (const p of mentioned) {
      peopleCtx += `**${p.name}** (${p.email})\n`;
      peopleCtx += `- Community: ${p.community_id ?? "N/A"}\n`;
      peopleCtx += `- PageRank: ${(p.pagerank ?? 0).toFixed(6)}\n`;
      peopleCtx += `- Betweenness Centrality: ${(p.betweenness ?? 0).toFixed(6)}\n`;
      peopleCtx += `- Eigenvector Centrality: ${(p.eigenvector ?? 0).toFixed(6)}\n`;
      peopleCtx += `- Emails Sent: ${p.total_sent ?? 0}\n`;
      peopleCtx += `- Emails Received: ${p.total_received ?? 0}\n`;
      peopleCtx += `- Avg Sent Sentiment: ${(p.avg_sent_sentiment ?? 0).toFixed(4)}\n`;
      peopleCtx += `- Avg Received Sentiment: ${(p.avg_received_sentiment ?? 0).toFixed(4)}\n\n`;
    }
  }

  const health = d.overview.health ?? {};
  const sub = health.sub_scores ?? {};
  const stats = health.stats ?? {};
  let orgCtx = "## Organization Overview\n\n";
  orgCtx += `- Health Score: ${health.health_score ?? "N/A"}/100 (Grade: ${health.grade ?? "N/A"})\n`;
  orgCtx += `- Connectivity: ${sub.connectivity ?? "N/A"}/100\n`;
  orgCtx += `- Bottleneck Risk: ${sub.bottleneck_risk ?? "N/A"}/100\n`;
  orgCtx += `- Silo Score: ${sub.silo_score ?? "N/A"}/100\n`;
  orgCtx += `- Efficiency: ${sub.efficiency ?? "N/A"}/100\n`;
  orgCtx += `- Total People: ${stats.node_count ?? "N/A"}\n`;
  orgCtx += `- Total Relationships: ${stats.edge_count ?? "N/A"}\n`;
  orgCtx += `- Communities: ${stats.communities_count ?? "N/A"}\n`;

  orgCtx += `\n**Most Critical People (Dead-Man-Switch):**\n`;
  for (const x of (d.dms.rankings ?? []).slice(0, 5)) {
    orgCtx += `- ${x.name}: DMS Score ${x.dms_score}, Impact ${x.impact_pct}%\n`;
  }
  orgCtx += `\n**Biggest Communication Waste:**\n`;
  for (const x of (d.waste.people ?? []).slice(0, 5)) {
    orgCtx += `- ${x.name}: Waste Score ${x.waste_score}\n`;
  }

  return emailCtx + "\n" + peopleCtx + "\n" + orgCtx;
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = typeof body.message === "string" ? body.message : "";
  if (!message.trim()) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const rawHist = Array.isArray(body.history) ? body.history : [];
  const history = rawHist
    .filter(
      (m): m is { role: string; content: string } =>
        m && typeof m === "object" && typeof (m as { role?: unknown }).role === "string" &&
        typeof (m as { content?: unknown }).content === "string",
    )
    .slice(-10);

  const data = await loadCtxData();
  const ctx = buildContext(message, data);

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user", content: `## Context\n${ctx}\n\n## Question\n${message}` },
  ];

  const oai = new OpenAI();
  const completion = await oai.chat.completions.create({
    model: "gpt-5.2",
    messages,
    stream: true,
    temperature: 0.3,
    max_completion_tokens: 2000,
  });

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
          }
        }
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify({ content: `\n\nError: ${msg}` })}\n\n`),
        );
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
