# Undercurrent — Production Architecture

This is how I'm designing the system to scale. The current implementation runs on a single machine with in-memory graph processing, but the architecture below shows where this is headed.

## 1. System Architecture (Production Vision)

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Next.js Web App]
        MOB[Mobile App - Future]
    end

    subgraph "API Gateway"
        GW[Kong / AWS API Gateway]
        AUTH[Auth Service<br/>OAuth 2.0 + SAML SSO]
        RL[Rate Limiter]
    end

    subgraph "Kubernetes Cluster"
        subgraph "Core Services"
            API[FastAPI<br/>Graph & Metrics API]
            CHAT[Chat Service<br/>SSE Streaming]
            REPORT[Report Generator<br/>Async Workers]
            INGEST[Ingestion Service<br/>Email Parser]
        end

        subgraph "ML Pipeline"
            NLP[NLP Workers<br/>Sentiment + NER]
            EMBED[Embedding Service<br/>OpenAI / Local]
            GNN[GNN Training<br/>Node Embeddings]
            ANOMALY[Anomaly Detection<br/>Temporal Alerts]
        end

        subgraph "Graph Engine"
            BUILDER[Graph Builder]
            METRICS[Metrics Computer<br/>Centrality, Communities]
            DMS[Dead-Man-Switch<br/>Critical Node Analysis]
        end
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Users, Orgs, Config)]
        NEO[(Neo4j<br/>Communication Graph)]
        ES[(Elasticsearch<br/>Email Full-Text Search)]
        CHROMA[(ChromaDB / Pinecone<br/>Vector Embeddings)]
        REDIS[(Redis<br/>Cache + Sessions)]
        S3[(S3 / MinIO<br/>Raw Email Storage)]
    end

    subgraph "Message Queue"
        MQ[RabbitMQ / Kafka]
    end

    WEB --> GW
    MOB --> GW
    GW --> AUTH
    GW --> RL
    AUTH --> API
    AUTH --> CHAT
    AUTH --> REPORT

    API --> NEO
    API --> PG
    API --> REDIS
    CHAT --> CHROMA
    CHAT --> REDIS

    INGEST --> MQ
    MQ --> NLP
    MQ --> EMBED
    MQ --> BUILDER

    NLP --> PG
    EMBED --> CHROMA
    BUILDER --> NEO
    BUILDER --> METRICS
    METRICS --> REDIS
    DMS --> NEO

    GNN --> NEO
    ANOMALY --> NEO
    ANOMALY --> MQ

    REPORT --> NEO
    REPORT --> CHROMA
    REPORT --> S3
```

## 2. Data Pipeline

```mermaid
graph LR
    subgraph "Input"
        EMAIL[Raw Email Data<br/>IMAP / Exchange / Upload]
    end

    subgraph "Ingestion"
        PARSE[Email Parser<br/>Headers + Body + Attachments]
        DEDUP[Deduplication<br/>Message-ID + Hash]
        NORM[Normalization<br/>Address Resolution]
    end

    subgraph "NLP Processing"
        SENT[Sentiment Analysis<br/>TextBlob / VADER]
        NER[Named Entity<br/>Recognition]
        TOPIC[Topic Modeling<br/>LDA / BERTopic]
        THREAD[Thread Detection<br/>In-Reply-To Chains]
    end

    subgraph "Graph Construction"
        NODES[Node Creation<br/>Person Entities]
        EDGES[Edge Computation<br/>Weighted Relationships]
        WEIGHT[Weight Scoring<br/>Frequency + Recency +<br/>Sentiment + Response Time]
    end

    subgraph "Analytics"
        CENT[Centrality Metrics<br/>Degree, Betweenness,<br/>Eigenvector, PageRank]
        COMM[Community Detection<br/>Louvain Clustering]
        DMS2[Dead-Man-Switch<br/>Critical Node Scoring]
        WASTE[Waste Detection<br/>8 Communication Wastes]
        HEALTH[Health Score<br/>Composite 0-100]
    end

    subgraph "Storage"
        STORE[(Graph DB + Cache + Vector DB)]
    end

    EMAIL --> PARSE --> DEDUP --> NORM
    NORM --> SENT & NER & TOPIC & THREAD
    SENT & NER & TOPIC & THREAD --> NODES & EDGES
    NODES & EDGES --> WEIGHT
    WEIGHT --> CENT & COMM & DMS2 & WASTE
    CENT & COMM & DMS2 & WASTE --> HEALTH
    HEALTH --> STORE
```

## 3. GraphRAG Architecture

```mermaid
graph TB
    subgraph "User Query"
        Q[Natural Language Question]
    end

    subgraph "Query Processing"
        QE[Query Embedding<br/>text-embedding-3-large]
        NE[Named Entity<br/>Extraction from Query]
        INTENT[Intent Classification<br/>Person / Team / Metric / General]
    end

    subgraph "Retrieval"
        VS[Vector Search<br/>ChromaDB Top-K=15]
        GC[Graph Context<br/>Node Metrics + Neighbors]
        ORG[Org Overview<br/>Health Score + Communities]
    end

    subgraph "Context Assembly"
        CTX[Composite Context<br/>Emails + Metrics + Structure]
        PROMPT[System Prompt<br/>Organizational Analyst Role]
    end

    subgraph "Generation"
        LLM[GPT-5<br/>Streaming Response]
        SSE[Server-Sent Events<br/>Token-by-Token]
    end

    subgraph "Response"
        R[Formatted Answer<br/>with Data Citations]
    end

    Q --> QE & NE & INTENT
    QE --> VS
    NE --> GC
    INTENT --> ORG
    VS & GC & ORG --> CTX
    CTX --> PROMPT
    PROMPT --> LLM
    LLM --> SSE
    SSE --> R
```

## 4. ML Pipeline (Future)

```mermaid
graph TB
    subgraph "Feature Engineering"
        TEMPORAL[Temporal Features<br/>Communication Patterns<br/>Over Time]
        STRUCTURAL[Structural Features<br/>Graph Topology Metrics]
        CONTENT[Content Features<br/>Sentiment, Topics,<br/>Language Patterns]
    end

    subgraph "Model Training"
        GNN2[Graph Neural Network<br/>Node2Vec / GraphSAGE]
        TS[Time Series Model<br/>Prophet / LSTM]
        CLASS[Classifier<br/>Attrition Risk / Performance]
    end

    subgraph "Inference"
        EMBED2[Node Embeddings<br/>128-dim Vectors]
        PRED[Predictions<br/>Risk Scores + Trends]
        ALERT[Alert System<br/>Anomaly Detection]
    end

    subgraph "Actions"
        DASH[Dashboard Updates<br/>Real-time Metrics]
        NOTIF[Notifications<br/>Email + Slack]
        REPORT2[Automated Reports<br/>Weekly / Monthly]
    end

    TEMPORAL & STRUCTURAL & CONTENT --> GNN2 & TS & CLASS
    GNN2 --> EMBED2
    TS --> PRED
    CLASS --> PRED
    PRED --> ALERT
    EMBED2 --> DASH
    ALERT --> NOTIF & REPORT2
```

## 5. Frontend Component Tree

```mermaid
graph TB
    ROOT[RootLayout<br/>Sidebar + Header]

    ROOT --> LAND[Landing Page<br/>FakeUpload]
    ROOT --> DASH2[Dashboard<br/>HealthScore + MetricCards +<br/>TopPeople + CommunityMap]
    ROOT --> GRAPH[Graph Explorer<br/>ForceGraph + Controls +<br/>NodeTooltip]
    ROOT --> PEOPLE[People<br/>Sortable Table]
    ROOT --> PERSON[Person Detail<br/>EgoNetwork + Metrics +<br/>Connections + Sentiment]
    ROOT --> CHAT2[Chat<br/>ChatWindow +<br/>SuggestedQuestions]
    ROOT --> REPORTS[Reports<br/>HealthReport +<br/>GenerateButton]

    LAND --> UPLOAD[FakeUpload<br/>Drag & Drop +<br/>Processing Animation]
    DASH2 --> HS[HealthScore<br/>Animated Gauge]
    DASH2 --> MC[MetricCard<br/>Icon + Value + Label]
    DASH2 --> TP[TopPeople<br/>Ranked List]
    DASH2 --> CM[CommunityMap<br/>Community Overview]
    GRAPH --> FG[ForceGraph<br/>react-force-graph-2d]
    GRAPH --> GC2[GraphControls<br/>Filters + Search]
    GRAPH --> NT[NodeTooltip<br/>Hover Details]
    CHAT2 --> CW[ChatWindow<br/>SSE Streaming]
    CHAT2 --> SQ[SuggestedQuestions<br/>Starter Prompts]
```
