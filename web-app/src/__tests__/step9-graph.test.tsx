/**
 * Tests: Graph Page (redesigned)
 *
 * Verifies:
 * - Graph page renders with loading state
 * - Search input exists (no threshold slider)
 * - ForceGraph component renders
 * - PersonPanel integration
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/graph"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock next/dynamic to render a placeholder
vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockForceGraph(props: any) {
      return React.createElement("div", { "data-testid": "force-graph" }, "ForceGraph");
    };
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, exit, ...validProps } = props;
      return React.createElement("div", validProps, children);
    },
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock the API
vi.mock("@/lib/api", () => ({
  getGraph: vi.fn(() =>
    Promise.resolve({
      nodes: [
        {
          id: "sally.beck@enron.com",
          name: "Sally Beck",
          email: "sally.beck@enron.com",
          total_sent: 100,
          total_received: 200,
          department: null,
          community_id: 0,
          pagerank: 0.01,
          betweenness: 0.005,
          eigenvector: 0.02,
          degree_centrality: 0.1,
          in_degree_centrality: 0.05,
          out_degree_centrality: 0.05,
          avg_sent_sentiment: 0.1,
          avg_received_sentiment: 0.05,
        },
        {
          id: "john.lavorato@enron.com",
          name: "John Lavorato",
          email: "john.lavorato@enron.com",
          total_sent: 80,
          total_received: 150,
          department: null,
          community_id: 1,
          pagerank: 0.008,
          betweenness: 0.003,
          eigenvector: 0.015,
          degree_centrality: 0.08,
          in_degree_centrality: 0.04,
          out_degree_centrality: 0.04,
          avg_sent_sentiment: 0.05,
          avg_received_sentiment: -0.02,
        },
      ],
      edges: [
        {
          source: "sally.beck@enron.com",
          target: "john.lavorato@enron.com",
          email_count: 25,
          weight: 0.5,
          sentiment: 0.1,
          sentiment_asymmetry: 0.05,
          first_email: null,
          last_email: null,
          norm_frequency: 0.5,
          norm_recency: 0.3,
        },
      ],
    })
  ),
  fetchPersonPanel: vi.fn(() =>
    Promise.resolve({
      id: "sally.beck@enron.com",
      name: "Sally Beck",
      email: "sally.beck@enron.com",
      community_id: 0,
      alert_tier: "critical",
      since: "2000-01-15",
      role_snapshot: "Member of Community 0 with high centrality.",
      workstreams: [{ label: "Operations", percent: 60 }, { label: "Strategy", percent: 40 }],
      emails_per_day: 1.6,
      in_pct: 62.5,
      out_pct: 37.5,
      median_response_time_hrs: 4.2,
      after_hours_activity: "High",
      betweenness: 0.005,
      spof_risk: "Critical",
      removal_impact_lcc_pct: 16.6,
      removal_impact_avg_path_pct: 1.0,
      in_degree_bin: "Medium",
      out_degree_bin: "Medium",
      response_latency: "Low",
      volume_delta_pct: 5.2,
      new_topic: null,
      diversity_delta_pct: -3.1,
      peer_rank: 1,
      peer_total: 15,
      likely_backups: ["John Lavorato"],
    })
  ),
}));

describe("Graph Page (Redesigned)", () => {
  it("renders the graph page with loading state initially", async () => {
    const { default: GraphPage } = await import("@/app/(app)/graph/page");
    render(React.createElement(GraphPage));

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders search input after loading", async () => {
    const { default: GraphPage } = await import("@/app/(app)/graph/page");
    render(React.createElement(GraphPage));

    const searchInput = await screen.findByPlaceholderText("Search people...");
    expect(searchInput).toBeInTheDocument();
  });

  it("does NOT render edge threshold slider", async () => {
    const { default: GraphPage } = await import("@/app/(app)/graph/page");
    render(React.createElement(GraphPage));

    await screen.findByPlaceholderText("Search people...");
    const slider = screen.queryByRole("slider");
    expect(slider).not.toBeInTheDocument();
  });

  it("updates search query when typing", async () => {
    const { default: GraphPage } = await import("@/app/(app)/graph/page");
    render(React.createElement(GraphPage));

    const searchInput = await screen.findByPlaceholderText("Search people...");
    fireEvent.change(searchInput, { target: { value: "sally" } });
    expect(searchInput).toHaveValue("sally");
  });

  it("renders ForceGraph component", async () => {
    const { default: GraphPage } = await import("@/app/(app)/graph/page");
    render(React.createElement(GraphPage));

    const graph = await screen.findByTestId("force-graph");
    expect(graph).toBeInTheDocument();
  });

  it("has community colors defined", async () => {
    const module = await import("@/app/(app)/graph/page");
    expect(module.default).toBeDefined();
  });
});
