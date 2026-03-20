"""FastAPI entry point — loads data, wires up routes."""

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import chat, graph, metrics, people, reports, risks, simulator, trends

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

OUT_DIR = Path(__file__).resolve().parents[2] / "output"


def _load_all():
    """Read json files into memory, init route modules."""
    graph_path = OUT_DIR / "graph.json"

    if not graph_path.exists():
        raise RuntimeError(
            f"Output data not found at {OUT_DIR}. Run the pipeline first: python -m src.pipeline"
        )

    with open(graph_path) as f:
        graph_data = json.load(f)
    with open(OUT_DIR / "metrics.json") as f:
        metrics_data = json.load(f)
    with open(OUT_DIR / "communities.json") as f:
        comms = json.load(f)

    # role snapshots optional
    roles: dict[str, str] = {}
    roles_path = OUT_DIR / "role_snapshots.json"
    if roles_path.exists():
        with open(roles_path) as f:
            roles = json.load(f)

    # wire up each route module with its data
    graph.init(graph_data, comms)
    metrics.init(metrics_data, comms, graph_data)
    people.init(graph_data, metrics_data, OUT_DIR / "people", comms, roles)
    trends.init(graph_data, metrics_data, comms)
    risks.init(graph_data, metrics_data)
    simulator.init(graph_data, comms, metrics_data)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_all()
    yield


app = FastAPI(
    title="Undercurrent API",
    description="Organizational Intelligence Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# cors setup — dev server plus optional deployed url
_allowed = ["http://localhost:3000", "http://127.0.0.1:3000"]
_frontend = os.environ.get("FRONTEND_URL")
if _frontend:
    _allowed.append(_frontend.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# hook up all routers
app.include_router(graph.router)
app.include_router(metrics.router)
app.include_router(people.router)
app.include_router(chat.router)
app.include_router(reports.router)
app.include_router(trends.router)
app.include_router(risks.router)
app.include_router(simulator.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
