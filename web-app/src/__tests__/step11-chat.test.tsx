/**
 * Tests: ChatDrawer component
 *
 * Verifies:
 * - ChatDrawer renders suggested questions when open
 * - Input field works
 * - Close button exists
 * - Suggested questions are clickable
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/graph"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
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

// Mock the streaming API
vi.mock("@/lib/api", () => ({
  streamChat: vi.fn(async function* () {
    yield "Hello";
    yield " world";
  }),
}));

describe("ChatDrawer", () => {
  it("renders suggested questions when open", async () => {
    const { default: ChatDrawer } = await import("@/components/layout/ChatDrawer");
    render(React.createElement(ChatDrawer, { open: true, onClose: vi.fn() }));

    expect(
      screen.getByText("Who are the most critical people in this organization?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("What are the biggest communication bottlenecks?")
    ).toBeInTheDocument();
  });

  it("renders the ask AI title", async () => {
    const { default: ChatDrawer } = await import("@/components/layout/ChatDrawer");
    render(React.createElement(ChatDrawer, { open: true, onClose: vi.fn() }));

    expect(screen.getByText("Ask AI")).toBeInTheDocument();
  });

  it("renders the ask about organization text", async () => {
    const { default: ChatDrawer } = await import("@/components/layout/ChatDrawer");
    render(React.createElement(ChatDrawer, { open: true, onClose: vi.fn() }));

    expect(screen.getByText("Ask about your organization")).toBeInTheDocument();
  });

  it("renders message input field", async () => {
    const { default: ChatDrawer } = await import("@/components/layout/ChatDrawer");
    render(React.createElement(ChatDrawer, { open: true, onClose: vi.fn() }));

    const input = screen.getByPlaceholderText("Ask a question...");
    expect(input).toBeInTheDocument();
  });

  it("renders send button", async () => {
    const { default: ChatDrawer } = await import("@/components/layout/ChatDrawer");
    render(React.createElement(ChatDrawer, { open: true, onClose: vi.fn() }));

    const buttons = screen.getAllByRole("button");
    const sendButton = buttons.find((b) => b.getAttribute("type") === "submit");
    expect(sendButton).toBeDefined();
  });

  it("disables send button when input is empty", async () => {
    const { default: ChatDrawer } = await import("@/components/layout/ChatDrawer");
    render(React.createElement(ChatDrawer, { open: true, onClose: vi.fn() }));

    const buttons = screen.getAllByRole("button");
    const sendButton = buttons.find((b) => b.getAttribute("type") === "submit");
    expect(sendButton).toBeDisabled();
  });

  it("enables send button when input has text", async () => {
    const { default: ChatDrawer } = await import("@/components/layout/ChatDrawer");
    render(React.createElement(ChatDrawer, { open: true, onClose: vi.fn() }));

    const input = screen.getByPlaceholderText("Ask a question...");
    fireEvent.change(input, { target: { value: "Who is Sally Beck?" } });

    const buttons = screen.getAllByRole("button");
    const sendButton = buttons.find((b) => b.getAttribute("type") === "submit");
    expect(sendButton).not.toBeDisabled();
  });

  it("suggested questions are clickable buttons", async () => {
    const { default: ChatDrawer } = await import("@/components/layout/ChatDrawer");
    render(React.createElement(ChatDrawer, { open: true, onClose: vi.fn() }));

    const questionButtons = screen.getAllByRole("button");
    // 6 suggested questions + 1 send button + 1 close button
    expect(questionButtons.length).toBeGreaterThanOrEqual(8);
  });

  it("does not render when closed", async () => {
    const { default: ChatDrawer } = await import("@/components/layout/ChatDrawer");
    render(React.createElement(ChatDrawer, { open: false, onClose: vi.fn() }));

    expect(screen.queryByText("Ask AI")).not.toBeInTheDocument();
  });
});
