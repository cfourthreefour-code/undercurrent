"""API endpoint tests — hits every route with real data."""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app, _load_all

# lifespan doesn't fire in TestClient, so load manually
_load_all()
client = TestClient(app)


class TestHealthCheck:
    def test_returns_ok(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestGraphEndpoints:
    def test_full_graph(self):
        resp = client.get("/api/graph")
        assert resp.status_code == 200
        body = resp.json()
        assert "nodes" in body and "edges" in body
        assert len(body["nodes"]) > 0
        assert len(body["edges"]) > 0

    def test_single_node(self):
        r = client.get("/api/graph")
        nid = r.json()["nodes"][0]["id"]
        resp = client.get("/api/graph/node/%s" % nid)
        assert resp.status_code == 200
        assert resp.json()["node"]["id"] == nid

    def test_node_404(self):
        resp = client.get("/api/graph/node/nonexistent@enron.com")
        assert resp.status_code == 404


class TestMetricsEndpoints:
    def test_overview(self):
        resp = client.get("/api/metrics/overview")
        assert resp.status_code == 200
        body = resp.json()
        assert "health" in body
        assert "health_score" in body["health"]
        assert "grade" in body["health"]

    def test_centrality_defaults_to_pagerank(self):
        resp = client.get("/api/metrics/centrality")
        assert resp.status_code == 200
        body = resp.json()
        assert body["type"] == "pagerank"
        assert len(body["rankings"]) > 0

    def test_centrality_betweenness(self):
        resp = client.get("/api/metrics/centrality?type=betweenness")
        assert resp.status_code == 200
        assert resp.json()["type"] == "betweenness"

    def test_communities(self):
        resp = client.get("/api/metrics/communities")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["communities"]) > 0
        assert "modularity" in body

    def test_dms(self):
        resp = client.get("/api/metrics/dead-man-switch")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["rankings"]) > 0
        assert "dms_score" in body["rankings"][0]

    def test_waste(self):
        resp = client.get("/api/metrics/waste")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["people"]) > 0
        assert "waste_score" in body["people"][0]


class TestPeopleEndpoints:
    def test_list(self):
        resp = client.get("/api/people")
        assert resp.status_code == 200
        assert len(resp.json()["people"]) > 0

    def test_detail(self):
        r = client.get("/api/people")
        pid = r.json()["people"][0]["id"]

        resp = client.get("/api/people/%s" % pid)
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == pid
        assert "metrics" in body
        assert "connections" in body

    def test_detail_404(self):
        resp = client.get("/api/people/nonexistent@enron.com")
        assert resp.status_code == 404

    def test_panel(self):
        r = client.get("/api/people")
        pid = r.json()["people"][0]["id"]

        resp = client.get("/api/people/%s/panel" % pid)
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == pid
        assert body["name"]
        assert body["email"]
        assert body["alert_tier"] in ("critical", "warning", "healthy")
        assert "role_snapshot" in body
        assert "workstreams" in body
        assert len(body["workstreams"]) >= 3
        assert "emails_per_day" in body
        assert "in_degree_norm" in body
        assert "out_degree_norm" in body
        assert "peer_rank" in body
        assert "comparable_peers" in body

    def test_panel_404(self):
        resp = client.get("/api/people/nonexistent@enron.com/panel")
        assert resp.status_code == 404


class TestTrendsEndpoint:
    def test_trends(self):
        resp = client.get("/api/trends")
        assert resp.status_code == 200
        body = resp.json()
        assert "structural_shifts" in body
        assert "communication_shifts" in body
        assert "workstream_shifts" in body
        assert len(body["structural_shifts"]) > 0
        assert "person_id" in body["structural_shifts"][0]
        assert "delta_pct" in body["structural_shifts"][0]


class TestRisksEndpoint:
    def test_risks(self):
        resp = client.get("/api/risks")
        assert resp.status_code == 200
        body = resp.json()
        assert "high_risk_nodes" in body
        assert "structural_risks" in body
        assert "communication_waste" in body
        assert len(body["high_risk_nodes"]) > 0
        assert "risk_score" in body["high_risk_nodes"][0]
        assert "risk_label" in body["high_risk_nodes"][0]
        assert len(body["structural_risks"]) > 0
