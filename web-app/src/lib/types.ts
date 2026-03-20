// core graph types
export interface GraphNode {
  id: string;
  name: string;
  email: string;
  community_id: number | null;
  department: string | null;
  total_sent: number;
  total_received: number;
  pagerank: number;
  betweenness: number;
  eigenvector: number;
  degree_centrality: number;
  in_degree_centrality: number;
  out_degree_centrality: number;
  avg_sent_sentiment: number;
  avg_received_sentiment: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  email_count: number;
  weight: number;
  sentiment: number;
  sentiment_asymmetry: number;
  first_email: string | null;
  last_email: string | null;
  norm_frequency: number;
  norm_recency: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  community_names?: Record<number, string>;
}

// health / metrics
export interface HealthSubScores {
  connectivity: number;
  bottleneck_risk: number;
  silo_score: number;
  efficiency: number;
}

export interface HealthStats {
  node_count: number;
  edge_count: number;
  density: number;
  avg_path_length: number | null;
  clustering_coefficient: number | null;
  communities_count: number;
  modularity: number;
  gcc_ratio: number;
}

export interface HealthData {
  health_score: number;
  grade: string;
  sub_scores: HealthSubScores;
  stats: HealthStats;
}

export interface MetricsOverview {
  health: HealthData;
  sentiment: {
    avg_sentiment: number;
    total_edges_with_sentiment: number;
    distribution: Record<string, number>;
    top_negative: Array<{ source: string; target: string; sentiment: number; source_name: string; target_name: string }>;
    top_positive: Array<{ source: string; target: string; sentiment: number; source_name: string; target_name: string }>;
  };
}

export interface CentralityEntry {
  id: string;
  name: string;
  score: number;
}

export interface CentralityResponse {
  type: string;
  rankings: CentralityEntry[];
}

export interface Community {
  id: number;
  members: string[];
  size: number;
  density: number;
}

export interface CommunitiesResponse {
  communities: Community[];
  bridge_nodes: string[];
  modularity: number;
}

// people
export interface PersonSummary {
  id: string;
  name: string;
  email: string;
  community_id: number | null;
  pagerank: number;
  betweenness: number;
  eigenvector: number;
  total_sent: number;
  total_received: number;
  avg_sent_sentiment: number;
  dms_score: number;
  waste_score: number;
  first_seen: string | null;
}

export interface ConnectionDetail {
  id: string;
  name: string;
  direction: string;
  email_count: number;
  weight: number;
  sentiment: number;
}

export interface PersonDetail {
  id: string;
  name: string;
  email: string;
  community_id: number | null;
  metrics: {
    pagerank: number;
    betweenness_centrality: number;
    eigenvector_centrality: number;
    degree_centrality: number;
    in_degree_centrality: number;
    out_degree_centrality: number;
  };
  sentiment: {
    avg_sent: number;
    avg_received: number;
  };
  dead_man_switch: Record<string, unknown>;
  waste: Record<string, unknown>;
  connections: ConnectionDetail[];
}

export type AlertTier = "critical" | "warning" | "healthy";

export interface Workstream {
  label: string;
  percent: number;
}

export interface PeerComparison {
  name: string;
  betweenness: number;
  pagerank: number;
  total_sent: number;
  total_received: number;
  similarity_score: number;
}

export interface PersonPanel {
  id: string;
  name: string;
  email: string;
  community_id: number | null;
  alert_tier: AlertTier;
  since: string | null;
  role_snapshot: string;
  workstreams: Workstream[];
  emails_per_day: number;
  in_pct: number;
  out_pct: number;
  median_response_time_hrs: number;
  after_hours_activity: string;
  in_degree_norm: number;
  out_degree_norm: number;
  response_latency: string;
  volume_delta_pct: number;
  new_topic: string | null;
  diversity_delta_pct: number;
  peer_rank: number;
  peer_total: number;
  likely_backups: string[];
  comparable_peers: PeerComparison[];
}

// risks + trends
export interface DMSEntry {
  id: string;
  name: string;
  dms_score: number;
  betweenness: number;
  eigenvector: number;
  redundancy: number;
  impact_pct: number;
}

export interface WasteEntry {
  id: string;
  name: string;
  waste_score: number;
  overproduction: number;
  broadcast_ratio: number;
  reply_all_ratio: number;
  orphan_ratio: number;
}

export interface TrendItem {
  person_id: string;
  person_name: string;
  metric: string;
  value: number;
  delta_pct: number;
}

export interface TrendsData {
  structural_shifts: TrendItem[];
  communication_shifts: TrendItem[];
  workstream_shifts: TrendItem[];
}

export interface HighRiskNode {
  id: string;
  name: string;
  risk_score: number;
  risk_label: string;
  key_vulnerability: string;
  impact_pct: number;
}

export interface StructuralRisk {
  label: string;
  description: string;
  severity: string;
  value: number;
}

export interface WasteOffender {
  id: string;
  name: string;
  waste_score: number;
  overproduction: number;
  reply_all_ratio: number;
  response_gap: number;
}

export interface RisksData {
  high_risk_nodes: HighRiskNode[];
  structural_risks: StructuralRisk[];
  communication_waste: WasteOffender[];
}

// what-if simulator
export interface SimHealthSnapshot {
  health_score: number;
  grade: string;
  sub_scores: {
    connectivity: number;
    bottleneck_risk: number;
    silo_score: number;
    efficiency: number;
  };
  node_count: number;
  edge_count: number;
  community_count: number;
}

export interface SimBottleneck {
  id: string;
  name: string;
  betweenness_before: number;
  betweenness_after: number;
}

export interface SimAffectedCommunity {
  id: number;
  label: string;
  size_before: number;
  size_after: number;
}

export interface SimulationResult {
  node_id: string;
  node_name: string;
  before: SimHealthSnapshot;
  after: SimHealthSnapshot;
  impact: {
    health_delta: number;
    edges_lost: number;
    orphaned_nodes: Array<{ id: string; name: string }>;
    fragmented: boolean;
    components: number;
    affected_communities: SimAffectedCommunity[];
    new_bottlenecks: SimBottleneck[];
  };
}

// misc
export interface ReportSection {
  title: string;
  content: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
