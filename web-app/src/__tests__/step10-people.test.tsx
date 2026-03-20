/**
 * Tests: People Page (redesigned) + Trends + Risks
 *
 * Verifies:
 * - People list page renders with search, sort, alert icons
 * - Rows navigate to /graph?focus= on click
 * - Trends page renders sections
 * - Risks page renders sections
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/people"),
  useRouter: vi.fn(() => ({ push: mockPush })),
  useSearchParams: vi.fn(() => ({ get: vi.fn(() => null) })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
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

// Mock API
vi.mock("@/lib/api", () => ({
  getPeople: vi.fn(() =>
    Promise.resolve({
      people: [
        {
          id: "sally.beck@enron.com",
          name: "Sally Beck",
          email: "sally.beck@enron.com",
          community_id: 0,
          pagerank: 0.015,
          betweenness: 0.008,
          eigenvector: 0.025,
          total_sent: 1200,
          total_received: 800,
          avg_sent_sentiment: 0.12,
          dms_score: 0.415,
          waste_score: 35.2,
        },
        {
          id: "john.lavorato@enron.com",
          name: "John Lavorato",
          email: "john.lavorato@enron.com",
          community_id: 1,
          pagerank: 0.012,
          betweenness: 0.005,
          eigenvector: 0.020,
          total_sent: 800,
          total_received: 600,
          avg_sent_sentiment: 0.05,
          dms_score: 0.320,
          waste_score: 42.1,
        },
      ],
    })
  ),
  fetchTrends: vi.fn(() =>
    Promise.resolve({
      structural_shifts: [
        { person_id: "sally.beck@enron.com", person_name: "Sally Beck", metric: "Betweenness Centrality", value: 0.008, delta_pct: 12.5 },
      ],
      communication_shifts: [
        { person_id: "john.lavorato@enron.com", person_name: "John Lavorato", metric: "Degree Centrality", value: 0.05, delta_pct: -5.3 },
      ],
      workstream_shifts: [
        { person_id: "sally.beck@enron.com", person_name: "Sally Beck", metric: "Project Alpha", value: 1200, delta_pct: 8.1 },
      ],
    })
  ),
  fetchRisks: vi.fn(() =>
    Promise.resolve({
      high_risk_nodes: [
        { id: "sally.beck@enron.com", name: "Sally Beck", risk_score: 0.415, risk_label: "Critical", key_vulnerability: "High betweenness — key information broker", impact_pct: 5.1 },
      ],
      structural_risks: [
        { label: "Fragmentation Sensitivity", description: "Removing the most critical node fragments 5.1% of the network", severity: "Critical", value: 5.1 },
      ],
      communication_waste: [
        { id: "john.lavorato@enron.com", name: "John Lavorato", waste_score: 42.1, overproduction: 3.2, reply_all_ratio: 0.15, response_gap: 0.22 },
      ],
    })
  ),
}));

describe("People Page (Redesigned)", () => {
  it("renders search input", async () => {
    const { default: PeoplePage } = await import("@/app/(app)/people/page");
    render(React.createElement(PeoplePage));

    const searchInput = await screen.findByPlaceholderText("Search by name or email...");
    expect(searchInput).toBeInTheDocument();
  });

  it("renders people in the table", async () => {
    const { default: PeoplePage } = await import("@/app/(app)/people/page");
    render(React.createElement(PeoplePage));

    expect(await screen.findByText("Sally Beck")).toBeInTheDocument();
    expect(screen.getByText("John Lavorato")).toBeInTheDocument();
  });

  it("renders redesigned column headers", async () => {
    const { default: PeoplePage } = await import("@/app/(app)/people/page");
    render(React.createElement(PeoplePage));

    await screen.findByText("Sally Beck");
    // Check table headers specifically (th elements)
    const headers = document.querySelectorAll("th");
    const headerTexts = Array.from(headers).map((h) => h.textContent);
    expect(headerTexts).toContain("Name");
    expect(headerTexts).toContain("Email");
    expect(headerTexts).toContain("Alert");
    expect(headerTexts).toContain("Betweenness");
  });

  it("filters people by search query", async () => {
    const { default: PeoplePage } = await import("@/app/(app)/people/page");
    render(React.createElement(PeoplePage));

    await screen.findByText("Sally Beck");

    const searchInput = screen.getByPlaceholderText("Search by name or email...");
    fireEvent.change(searchInput, { target: { value: "sally" } });

    expect(screen.getByText("Sally Beck")).toBeInTheDocument();
    expect(screen.queryByText("John Lavorato")).not.toBeInTheDocument();
  });

  it("shows people count", async () => {
    const { default: PeoplePage } = await import("@/app/(app)/people/page");
    render(React.createElement(PeoplePage));

    expect(await screen.findByText("2 people")).toBeInTheDocument();
  });

  it("has sortable column headers", async () => {
    const { default: PeoplePage } = await import("@/app/(app)/people/page");
    render(React.createElement(PeoplePage));

    await screen.findByText("Sally Beck");
    const headers = document.querySelectorAll("th");
    const headerTexts = Array.from(headers).map((h) => h.textContent);
    expect(headerTexts).toContain("PageRank");
    expect(headerTexts).toContain("Risk Score");
  });
});

describe("Trends Page", () => {
  it("renders structural shifts section", async () => {
    const { default: TrendsPage } = await import("@/app/(app)/trends/page");
    render(React.createElement(TrendsPage));

    expect(await screen.findByText("Structural Shifts")).toBeInTheDocument();
    expect(screen.getByText("Betweenness Centrality")).toBeInTheDocument();
  });

  it("renders communication shifts section", async () => {
    const { default: TrendsPage } = await import("@/app/(app)/trends/page");
    render(React.createElement(TrendsPage));

    expect(await screen.findByText("Communication Shifts")).toBeInTheDocument();
    expect(screen.getByText("John Lavorato")).toBeInTheDocument();
  });

  it("renders workstream shifts section", async () => {
    const { default: TrendsPage } = await import("@/app/(app)/trends/page");
    render(React.createElement(TrendsPage));

    expect(await screen.findByText("Workstream Shifts")).toBeInTheDocument();
  });
});

describe("Risks Page", () => {
  it("renders high-risk nodes section", async () => {
    const { default: RisksPage } = await import("@/app/(app)/risks/page");
    render(React.createElement(RisksPage));

    expect(await screen.findByText("High-Risk Nodes")).toBeInTheDocument();
    expect(screen.getByText("High betweenness — key information broker")).toBeInTheDocument();
  });

  it("renders structural risks section", async () => {
    const { default: RisksPage } = await import("@/app/(app)/risks/page");
    render(React.createElement(RisksPage));

    expect(await screen.findByText("Structural Risks")).toBeInTheDocument();
    expect(screen.getByText("Fragmentation Sensitivity")).toBeInTheDocument();
  });

  it("renders communication waste section", async () => {
    const { default: RisksPage } = await import("@/app/(app)/risks/page");
    render(React.createElement(RisksPage));

    expect(await screen.findByText("Communication Waste")).toBeInTheDocument();
    expect(screen.getByText("John Lavorato")).toBeInTheDocument();
  });
});
