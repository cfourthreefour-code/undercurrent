/**
 * Tests: Reports Page & Landing Page (redesigned)
 *
 * Verifies:
 * - Reports page renders with generate button
 * - Landing page renders Undercurrent branding + shader
 * - Upload card on landing page
 * - Processing animation
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock next/dynamic (for ShaderAnimation)
vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockShader() {
      return React.createElement("div", { "data-testid": "shader-animation" }, "Shader");
    };
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, exit, whileHover, whileTap, ...validProps } = props;
      return React.createElement("div", validProps, children);
    },
  },
  AnimatePresence: ({ children }: any) => {
    const child = Array.isArray(children) ? children.find(Boolean) : children;
    return child;
  },
}));

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: any) => React.createElement("div", null, children),
}));

// Mock API
vi.mock("@/lib/api", () => ({
  getHealthReport: vi.fn(() =>
    Promise.resolve({
      report: [
        { title: "Executive Summary", content: "This organization shows signs of..." },
        { title: "Critical Personnel", content: "Sally Beck is the most critical..." },
        { title: "Communication Structure", content: "17 communities detected..." },
      ],
    })
  ),
}));

describe("Reports Page", () => {
  it("renders the generate report button", async () => {
    const { default: ReportsPage } = await import("@/app/(app)/reports/page");
    render(React.createElement(ReportsPage));

    expect(screen.getByText("Generate Report")).toBeInTheDocument();
  });

  it("renders the report description", async () => {
    const { default: ReportsPage } = await import("@/app/(app)/reports/page");
    render(React.createElement(ReportsPage));

    expect(screen.getByText("Organizational Health Report")).toBeInTheDocument();
    expect(screen.getByText(/comprehensive diagnostic report/)).toBeInTheDocument();
  });

  it("shows loading state when generating", async () => {
    const { default: ReportsPage } = await import("@/app/(app)/reports/page");
    render(React.createElement(ReportsPage));

    const button = screen.getByText("Generate Report");
    fireEvent.click(button);

    expect(screen.getByText("Generating report...")).toBeInTheDocument();
  });

  it("displays report sections after generation", async () => {
    const { default: ReportsPage } = await import("@/app/(app)/reports/page");
    render(React.createElement(ReportsPage));

    const button = screen.getByText("Generate Report");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    });

    expect(screen.getByText("Critical Personnel")).toBeInTheDocument();
    expect(screen.getByText("Communication Structure")).toBeInTheDocument();
  });

  it("shows print button after report is generated", async () => {
    const { default: ReportsPage } = await import("@/app/(app)/reports/page");
    render(React.createElement(ReportsPage));

    fireEvent.click(screen.getByText("Generate Report"));

    await waitFor(() => {
      expect(screen.getByText("Print / Save PDF")).toBeInTheDocument();
    });
  });
});

describe("Landing Page (Redesigned)", () => {
  it("renders Undercurrent branding", async () => {
    const { default: LandingPage } = await import("@/app/page");
    render(React.createElement(LandingPage));

    expect(screen.getByText("Undercurrent")).toBeInTheDocument();
  });

  it("renders upload card", async () => {
    const { default: LandingPage } = await import("@/app/page");
    render(React.createElement(LandingPage));

    expect(screen.getByText("Upload your email data")).toBeInTheDocument();
  });

  it("renders drop zone with instructions", async () => {
    const { default: LandingPage } = await import("@/app/page");
    render(React.createElement(LandingPage));

    expect(screen.getByText(/\.mbox, \.pst, or maildir format/)).toBeInTheDocument();
  });

  it("renders privacy notice", async () => {
    const { default: LandingPage } = await import("@/app/page");
    render(React.createElement(LandingPage));

    expect(
      screen.getByText(/Processed locally/)
    ).toBeInTheDocument();
  });

  it("starts processing animation on click", async () => {
    const { default: LandingPage } = await import("@/app/page");
    render(React.createElement(LandingPage));

    const uploadCard = screen.getByText("Upload your email data").closest("div");
    fireEvent.click(uploadCard!);

    await waitFor(() => {
      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    });
  });

  it("shows processing steps after click", async () => {
    const { default: LandingPage } = await import("@/app/page");
    render(React.createElement(LandingPage));

    const uploadCard = screen.getByText("Upload your email data").closest("div");
    fireEvent.click(uploadCard!);

    await waitFor(() => {
      expect(screen.getByText("Parsing emails...")).toBeInTheDocument();
      expect(screen.getByText("Building communication graph...")).toBeInTheDocument();
      expect(screen.getByText("Computing centrality metrics...")).toBeInTheDocument();
    });
  });
});
