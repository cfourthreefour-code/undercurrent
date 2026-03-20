import type {
  GraphData,
  GraphNode,
  GraphEdge,
  MetricsOverview,
  CentralityResponse,
  CommunitiesResponse,
  DMSEntry,
  WasteEntry,
  PersonSummary,
  PersonDetail,
  PersonPanel,
  ReportSection,
  TrendsData,
  RisksData,
  SimulationResult,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const getGraph = () => apiFetch<GraphData>("/api/graph");

export const getGraphNode = (id: string) =>
  apiFetch<{ node: GraphNode; connections: GraphEdge[] }>(`/api/graph/node/${encodeURIComponent(id)}`);

export const getMetricsOverview = () => apiFetch<MetricsOverview>("/api/metrics/overview");

export const getCentrality = (type = "pagerank") =>
  apiFetch<CentralityResponse>(`/api/metrics/centrality?type=${type}`);

export const getCommunities = () => apiFetch<CommunitiesResponse>("/api/metrics/communities");

export const getDeadManSwitch = () => apiFetch<{ rankings: DMSEntry[] }>("/api/metrics/dead-man-switch");

export const getWaste = () => apiFetch<{ people: WasteEntry[] }>("/api/metrics/waste");

export const getPeople = () => apiFetch<{ people: PersonSummary[] }>("/api/people");

export const getPerson = (id: string) =>
  apiFetch<PersonDetail>(`/api/people/${encodeURIComponent(id)}`);

export const getHealthReport = () =>
  apiFetch<{ report: ReportSection[] }>("/api/reports/health");

export const fetchPersonPanel = (id: string) =>
  apiFetch<PersonPanel>(`/api/people/${encodeURIComponent(id)}/panel`);

export const fetchTrends = () => apiFetch<TrendsData>("/api/trends");

export const fetchRisks = () => apiFetch<RisksData>("/api/risks");

export const simulateDeparture = (id: string) =>
  apiFetch<SimulationResult>(`/api/simulate/${encodeURIComponent(id)}`);

export async function* streamChat(
  message: string,
  history: Array<{ role: string; content: string }> = []
): AsyncGenerator<string> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) throw new Error(`chat error: ${res.status}`);

  const rd = res.body?.getReader();
  if (!rd) throw new Error("no response body");

  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await rd.read();
    if (done) break;

    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const chunk = line.slice(6).trim();
      if (chunk === "[DONE]") return;
      try {
        const evt = JSON.parse(chunk);
        if (evt.content) yield evt.content;
      } catch {
        // skip bad lines
      }
    }
  }
}
