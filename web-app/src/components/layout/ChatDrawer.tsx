"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, X } from "lucide-react";
import Markdown from "react-markdown";
import { streamChat } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

const PROMPTS = [
  "Who are the most critical people in this organization?",
  "What are the biggest communication bottlenecks?",
  "Which teams are the most siloed?",
  "What would happen if Sally Beck left?",
  "Which relationships show the most negative sentiment?",
  "Who are the bridge people connecting different communities?",
];

export default function AskDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;

    setMsgs((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setBusy(true);

    // placeholder for the assistant reply
    setMsgs((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const hist = msgs.map((m) => ({ role: m.role, content: m.content }));
      for await (const token of streamChat(text, hist)) {
        setMsgs((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: last.content + token };
          }
          return copy;
        });
      }
    } catch {
      setMsgs((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last.role === "assistant" && !last.content) {
          copy[copy.length - 1] = {
            ...last,
            content: "Error — make sure the API server is running.",
          };
        }
        return copy;
      });
    }

    setBusy(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            ref={panelRef}
            className="fixed bottom-0 right-0 top-0 z-[70] flex w-[420px] flex-col border-l border-[var(--card-border)] bg-white"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* header */}
            <div className="flex h-14 items-center justify-between border-b border-[var(--card-border)] px-4">
              <span className="text-sm font-semibold">Ask AI</span>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-[var(--muted)] hover:bg-gray-100 hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* message list */}
            <div className="flex-1 overflow-y-auto p-4">
              {msgs.length === 0 ? (
                <div className="pt-8">
                  <div className="mb-6 text-center">
                    <Sparkles className="mx-auto mb-2 h-6 w-6 text-[var(--muted)]" />
                    <p className="text-sm text-[var(--muted)]">Ask about your organization</p>
                  </div>
                  <div className="space-y-2">
                    {PROMPTS.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="w-full rounded-lg border border-[var(--card-border)] p-2.5 text-left text-xs transition-colors hover:bg-gray-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {msgs.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-[var(--foreground)] text-white"
                            : "bg-gray-100"
                        }`}
                      >
                        <div className="prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-headings:font-semibold prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                          {msg.content ? (
                            msg.role === "assistant" ? (
                              <Markdown>{msg.content}</Markdown>
                            ) : (
                              <span className="whitespace-pre-wrap">{msg.content}</span>
                            )
                          ) : busy && i === msgs.length - 1 ? (
                            <span className="inline-block h-4 w-2 animate-pulse bg-[var(--foreground)]" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* input */}
            <div className="border-t border-[var(--card-border)] p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={busy}
                  className="flex-1 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--foreground)]"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="rounded-lg bg-[var(--foreground)] p-2 text-white transition-colors disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
