"""Pydantic schemas for API responses."""

from pydantic import BaseModel


# ============ Graph ============

class NodeResponse(BaseModel):
    id: str
    name: str
    email: str
    total_sent: int = 0
    total_received: int = 0
    department: str | None = None
    community_id: int | None = None
    pagerank: float = 0
    betweenness: float = 0
    eigenvector: float = 0
    degree_centrality: float = 0
    in_degree_centrality: float = 0
    out_degree_centrality: float = 0
    avg_sent_sentiment: float = 0
    avg_received_sentiment: float = 0


class EdgeResponse(BaseModel):
    source: str
    target: str
    email_count: int = 0
    weight: float = 0
    sentiment: float = 0
    sentiment_asymmetry: float = 0
    first_email: str | None = None
    last_email: str | None = None
    norm_frequency: float = 0
    norm_recency: float = 0


class GraphResponse(BaseModel):
    nodes: list[NodeResponse]
    edges: list[EdgeResponse]
    community_names: dict[int, str] = {}


class NodeDetailResponse(BaseModel):
    node: NodeResponse
    connections: list[EdgeResponse]


# ============ Metrics / Health ============

class HealthSubScores(BaseModel):
    connectivity: float
    bottleneck_risk: float
    silo_score: float
    efficiency: float


class StatsResponse(BaseModel):
    node_count: int
    edge_count: int
    density: float
    avg_path_length: float | None = None
    clustering_coefficient: float | None = None
    communities_count: int = 0
    modularity: float = 0
    gcc_ratio: float = 0


class HealthResponse(BaseModel):
    health_score: float
    grade: str
    sub_scores: HealthSubScores
    stats: StatsResponse


class MetricsOverviewResponse(BaseModel):
    health: HealthResponse
    sentiment: dict


class CentralityEntry(BaseModel):
    id: str
    name: str
    score: float


class CentralityResponse(BaseModel):
    type: str
    rankings: list[CentralityEntry]


# ============ Communities ============

class CommunityResponse(BaseModel):
    id: int
    members: list[str]
    size: int
    density: float
    label: str = ""


class CommunitiesResponse(BaseModel):
    communities: list[CommunityResponse]
    bridge_nodes: list[str]
    modularity: float


# ============ DMS / Waste ============

class DMSEntry(BaseModel):
    id: str
    name: str
    dms_score: float
    betweenness: float
    eigenvector: float
    redundancy: float
    impact_pct: float


class DMSResponse(BaseModel):
    rankings: list[DMSEntry]


class WasteEntry(BaseModel):
    id: str
    name: str
    waste_score: float
    overproduction: float
    broadcast_ratio: float
    reply_all_ratio: float
    orphan_ratio: float


class WasteResponse(BaseModel):
    people: list[WasteEntry]


# ============ People ============

class PersonSummary(BaseModel):
    id: str
    name: str
    email: str
    community_id: int | None = None
    pagerank: float = 0
    betweenness: float = 0
    eigenvector: float = 0
    total_sent: int = 0
    total_received: int = 0
    avg_sent_sentiment: float = 0
    dms_score: float = 0
    waste_score: float = 0
    first_seen: str | None = None


class PeopleListResponse(BaseModel):
    people: list[PersonSummary]


class ConnectionDetail(BaseModel):
    id: str
    name: str
    direction: str
    email_count: int = 0
    weight: float = 0
    sentiment: float = 0


class PersonMetrics(BaseModel):
    pagerank: float = 0
    betweenness_centrality: float = 0
    eigenvector_centrality: float = 0
    degree_centrality: float = 0
    in_degree_centrality: float = 0
    out_degree_centrality: float = 0


class PersonSentiment(BaseModel):
    avg_sent: float = 0
    avg_received: float = 0


class PersonDetailResponse(BaseModel):
    id: str
    name: str
    email: str
    community_id: int | None = None
    metrics: PersonMetrics
    sentiment: PersonSentiment
    dead_man_switch: dict = {}
    waste: dict = {}
    connections: list[ConnectionDetail] = []


# ============ Person Panel ============

class Workstream(BaseModel):
    label: str
    percent: int


class PeerComparison(BaseModel):
    name: str
    betweenness: float = 0
    pagerank: float = 0
    total_sent: int = 0
    total_received: int = 0
    similarity_score: float = 0


class PersonPanelResponse(BaseModel):
    id: str
    name: str
    email: str
    community_id: int | None = None
    alert_tier: str  # "critical" | "warning" | "healthy"
    since: str | None = None

    role_snapshot: str
    workstreams: list[Workstream]

    # communication health
    emails_per_day: float
    in_pct: float
    out_pct: float
    median_response_time_hrs: float
    after_hours_activity: str  # Low / Med / High

    # influence & flow
    in_degree_norm: float
    out_degree_norm: float
    response_latency: str  # Low / Med / High

    # recent changes (14d)
    volume_delta_pct: float
    new_topic: str | None = None
    diversity_delta_pct: float

    # comparisons
    peer_rank: int
    peer_total: int
    likely_backups: list[str]
    comparable_peers: list[PeerComparison] = []


# ============ Trends ============

class TrendItem(BaseModel):
    person_id: str
    person_name: str
    metric: str
    value: float
    delta_pct: float


class TrendsResponse(BaseModel):
    structural_shifts: list[TrendItem]
    communication_shifts: list[TrendItem]
    workstream_shifts: list[TrendItem]


# ============ Risks ============

class HighRiskNode(BaseModel):
    id: str
    name: str
    risk_score: float
    risk_label: str
    key_vulnerability: str
    impact_pct: float


class StructuralRisk(BaseModel):
    label: str
    description: str
    severity: str  # Low / Medium / High / Critical
    value: float


class WasteOffender(BaseModel):
    id: str
    name: str
    waste_score: float
    overproduction: float
    reply_all_ratio: float
    response_gap: float


class RisksResponse(BaseModel):
    high_risk_nodes: list[HighRiskNode]
    structural_risks: list[StructuralRisk]
    communication_waste: list[WasteOffender]


# ============ Chat / Reports ============

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class ReportSection(BaseModel):
    title: str
    content: str


class ReportResponse(BaseModel):
    report: list[ReportSection]
