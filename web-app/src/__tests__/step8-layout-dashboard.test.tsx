/**
 * Tests: TopNav, Layout, API Client
 *
 * Verifies:
 * - TopNav renders navigation tabs
 * - TopNav has chat toggle button
 * - TopNav links to correct pages
 * - API client exports all required functions
 * - TypeScript types module loads
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

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: any) =>
    React.createElement("img", { alt, ...props }),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, exit, whileHover, whileTap, ...validProps } = props;
      return React.createElement("div", validProps, children);
    },
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe("TopNav Navigation", () => {
  it("renders all navigation tabs", async () => {
    const { default: TopNav } = await import("@/components/layout/TopNav");
    render(React.createElement(TopNav, { onChatToggle: vi.fn() }));

    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Trends")).toBeInTheDocument();
    expect(screen.getByText("Risks")).toBeInTheDocument();
    expect(screen.getByText("Report")).toBeInTheDocument();
  });

  it("has correct navigation links", async () => {
    const { default: TopNav } = await import("@/components/layout/TopNav");
    render(React.createElement(TopNav, { onChatToggle: vi.fn() }));

    const peopleLink = screen.getByText("People").closest("a");
    expect(peopleLink).toHaveAttribute("href", "/people");

    const trendsLink = screen.getByText("Trends").closest("a");
    expect(trendsLink).toHaveAttribute("href", "/trends");

    const risksLink = screen.getByText("Risks").closest("a");
    expect(risksLink).toHaveAttribute("href", "/risks");

    const reportLink = screen.getByText("Report").closest("a");
    expect(reportLink).toHaveAttribute("href", "/reports");
  });

  it("has Undercurrent logo linking to graph", async () => {
    const { default: TopNav } = await import("@/components/layout/TopNav");
    render(React.createElement(TopNav, { onChatToggle: vi.fn() }));

    const logo = screen.getByAltText("Undercurrent");
    expect(logo).toBeInTheDocument();
    const logoLink = logo.closest("a");
    expect(logoLink).toHaveAttribute("href", "/graph");
  });

  it("has chat toggle button", async () => {
    const onChatToggle = vi.fn();
    const { default: TopNav } = await import("@/components/layout/TopNav");
    render(React.createElement(TopNav, { onChatToggle }));

    const chatButton = screen.getByLabelText("Open chat");
    expect(chatButton).toBeInTheDocument();
    fireEvent.click(chatButton);
    expect(onChatToggle).toHaveBeenCalledTimes(1);
  });
});

describe("API Client", () => {
  it("exports all required API functions", async () => {
    const api = await import("@/lib/api");

    expect(typeof api.getGraph).toBe("function");
    expect(typeof api.getGraphNode).toBe("function");
    expect(typeof api.getMetricsOverview).toBe("function");
    expect(typeof api.getCentrality).toBe("function");
    expect(typeof api.getCommunities).toBe("function");
    expect(typeof api.getDeadManSwitch).toBe("function");
    expect(typeof api.getWaste).toBe("function");
    expect(typeof api.getPeople).toBe("function");
    expect(typeof api.getPerson).toBe("function");
    expect(typeof api.getHealthReport).toBe("function");
    expect(typeof api.streamChat).toBe("function");
    expect(typeof api.fetchPersonPanel).toBe("function");
    expect(typeof api.fetchTrends).toBe("function");
    expect(typeof api.fetchRisks).toBe("function");
  });
});

describe("TypeScript Types", () => {
  it("exports all required interfaces", async () => {
    const types = await import("@/lib/types");
    expect(types).toBeDefined();
  });
});
