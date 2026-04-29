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

async function loadFixture<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load fixture ${path}: ${res.status}`);
  return res.json();
}

let _graphPromise: Promise<GraphData> | null = null;
let _peopleDetailPromise: Promise<Record<string, PersonDetail>> | null = null;
let _panelsPromise: Promise<Record<string, PersonPanel>> | null = null;

export function getGraph(): Promise<GraphData> {
  if (!_graphPromise) {
    _graphPromise = loadFixture<GraphData>("/data/graph.json").catch((err) => {
      _graphPromise = null;
      throw err;
    });
  }
  return _graphPromise;
}

export async function getGraphNode(
  id: string,
): Promise<{ node: GraphNode; connections: GraphEdge[] }> {
  const graph = await getGraph();
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Node not found: ${id}`);
  const connections = graph.edges.filter((e) => e.source === id || e.target === id);
  return { node, connections };
}

export const getMetricsOverview = () =>
  loadFixture<MetricsOverview>("/data/metrics/overview.json");

export const getCentrality = (type = "pagerank") =>
  loadFixture<CentralityResponse>(`/data/metrics/centrality-${type}.json`);

export const getCommunities = () =>
  loadFixture<CommunitiesResponse>("/data/metrics/communities.json");

export const getDeadManSwitch = () =>
  loadFixture<{ rankings: DMSEntry[] }>("/data/metrics/dead-man-switch.json");

export const getWaste = () =>
  loadFixture<{ people: WasteEntry[] }>("/data/metrics/waste.json");

export const getPeople = () =>
  loadFixture<{ people: PersonSummary[] }>("/data/people.json");

function getPeopleDetailMap(): Promise<Record<string, PersonDetail>> {
  if (!_peopleDetailPromise) {
    _peopleDetailPromise = loadFixture<Record<string, PersonDetail>>(
      "/data/people-detail.json",
    ).catch((err) => {
      _peopleDetailPromise = null;
      throw err;
    });
  }
  return _peopleDetailPromise;
}

export async function getPerson(id: string): Promise<PersonDetail> {
  const map = await getPeopleDetailMap();
  const detail = map[id];
  if (!detail) throw new Error(`Person not found: ${id}`);
  return detail;
}

function getPanelsMap(): Promise<Record<string, PersonPanel>> {
  if (!_panelsPromise) {
    _panelsPromise = loadFixture<Record<string, PersonPanel>>("/data/panels.json").catch((err) => {
      _panelsPromise = null;
      throw err;
    });
  }
  return _panelsPromise;
}

export async function fetchPersonPanel(id: string): Promise<PersonPanel> {
  const map = await getPanelsMap();
  const panel = map[id];
  if (!panel) throw new Error(`Panel not found: ${id}`);
  return panel;
}

export const fetchTrends = () => loadFixture<TrendsData>("/data/trends.json");

export const fetchRisks = () => loadFixture<RisksData>("/data/risks.json");

export const getHealthReport = () =>
  loadFixture<{ report: ReportSection[] }>("/data/reports/health.json");

export const simulateDeparture = (id: string) => {
  console.warn("[api] simulateDeparture requires backend — feature unavailable in production deployment");
  return apiFetch<SimulationResult>(`/api/simulate/${encodeURIComponent(id)}`);
};

export async function* streamChat(
  message: string,
  history: Array<{ role: string; content: string }> = []
): AsyncGenerator<string> {
  const res = await fetch(`/api/chat`, {
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
