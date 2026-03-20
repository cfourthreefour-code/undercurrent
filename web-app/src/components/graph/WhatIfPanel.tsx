"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Loader2, X } from "lucide-react";
import { simulateDeparture } from "@/lib/api";
import type { SimulationResult } from "@/lib/types";

// reuse same slide-in as PersonPanel
const slideIn = {
  initial: { x: 380 },
  animate: { x: 0 },
  transition: { type: "spring", damping: 25, stiffness: 300 },
} as const;

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [expanded, setExpanded] = useState(open);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        {title}
        <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && <div className="pb-3">{children}</div>}
    </div>
  );
}

function Delta({ val }: { val: number }) {
  const sign = val > 0 ? "+" : "";
  const cls = val < -0.5 ? "text-red-600" : val > 0.5 ? "text-green-600" : "text-[var(--muted)]";
  return <span className={`font-mono text-sm font-semibold ${cls}`}>{sign}{val}</span>;
}

function SubScoreRow({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = Math.round((after - before) * 10) / 10;
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-2 font-mono">
        <span className="text-[var(--muted)]">{before}</span>
        <span className="text-[10px] text-gray-300">→</span>
        <span className="font-medium">{after}</span>
        <Delta val={delta} />
      </div>
    </div>
  );
}

export default function WhatIfPanel({
  nodeId,
  onClose,
  onBack,
}: {
  nodeId: string;
  onClose: () => void;
  onBack: () => void;
}) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setBusy(true);
    setErr(null);
    simulateDeparture(nodeId)
      .then(setResult)
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  }, [nodeId]);

  return (
    <motion.div
      className="flex h-full w-[380px] flex-shrink-0 flex-col border-l border-gray-200 bg-white"
      {...slideIn}
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">What If?</div>
          {result && <div className="truncate text-sm font-semibold">{result.node_name} leaves</div>}
        </div>
        <button onClick={onClose}>
          <X className="h-4 w-4 text-[var(--muted)] hover:text-[var(--foreground)]" />
        </button>
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {busy && (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Simulating departure...
          </div>
        )}

        {err && (
          <div className="mt-6 text-center text-sm text-red-500">
            {err}
          </div>
        )}

        {result && !busy && (() => {
          const { before, after, impact } = result;
          const scoreDelta = impact.health_delta;

          return (
            <>
              {/* fragmentation warning */}
              {impact.fragmented && (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>Removing this person splits the network into <strong>{impact.components} disconnected components</strong>.</span>
                </div>
              )}

              {/* health score hero */}
              <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Org Health Score</div>
                <div className="flex items-end justify-center gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[var(--muted)]">{before.health_score}</div>
                    <div className="text-[10px] text-[var(--muted)]">before</div>
                  </div>
                  <div className="mb-1 text-gray-300">→</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{after.health_score}</div>
                    <div className="text-[10px] text-[var(--muted)]">after</div>
                  </div>
                </div>
                <div className="mt-2">
                  <Delta val={scoreDelta} />
                  <span className="ml-1 text-xs text-[var(--muted)]">pts</span>
                </div>
              </div>

              {/* sub-scores */}
              <div className="mb-4 space-y-0.5">
                <SubScoreRow label="Connectivity" before={before.sub_scores.connectivity} after={after.sub_scores.connectivity} />
                <SubScoreRow label="Bottleneck Risk" before={before.sub_scores.bottleneck_risk} after={after.sub_scores.bottleneck_risk} />
                <SubScoreRow label="Silo Score" before={before.sub_scores.silo_score} after={after.sub_scores.silo_score} />
                <SubScoreRow label="Efficiency" before={before.sub_scores.efficiency} after={after.sub_scores.efficiency} />
              </div>

              {/* impact stats */}
              <div className="mb-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Edges Lost", value: impact.edges_lost },
                  { label: "Orphaned", value: impact.orphaned_nodes.length },
                  { label: "Communities", value: `${before.community_count} → ${after.community_count}` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-center">
                    <div className="font-mono text-base font-bold">{value}</div>
                    <div className="text-[10px] text-[var(--muted)]">{label}</div>
                  </div>
                ))}
              </div>

              {/* accordions */}
              <div className="border-t border-gray-100">
                {impact.new_bottlenecks.length > 0 && (
                  <Accordion title={`New Bottlenecks (${impact.new_bottlenecks.length})`} open>
                    <div className="space-y-2">
                      {impact.new_bottlenecks.map((b) => (
                        <div key={b.id} className="rounded-lg bg-gray-50 px-3 py-2">
                          <div className="text-sm font-medium">{b.name}</div>
                          <div className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">
                            betweenness {b.betweenness_before.toFixed(4)} → <span className="text-red-600 font-semibold">{b.betweenness_after.toFixed(4)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Accordion>
                )}

                {impact.affected_communities.length > 0 && (
                  <Accordion title={`Affected Communities (${impact.affected_communities.length})`} open>
                    <div className="space-y-1.5">
                      {impact.affected_communities.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                          <span className="font-medium">{c.label}</span>
                          <span className="font-mono text-xs text-[var(--muted)]">
                            {c.size_before} → {c.size_after} members
                          </span>
                        </div>
                      ))}
                    </div>
                  </Accordion>
                )}

                {impact.orphaned_nodes.length > 0 && (
                  <Accordion title={`Orphaned Nodes (${impact.orphaned_nodes.length})`}>
                    <div className="space-y-1">
                      {impact.orphaned_nodes.map((n) => (
                        <div key={n.id} className="text-sm text-[var(--muted)]">{n.name}</div>
                      ))}
                    </div>
                  </Accordion>
                )}

                {impact.orphaned_nodes.length === 0 && impact.new_bottlenecks.length === 0 && !impact.fragmented && (
                  <div className="py-4 text-center text-sm text-[var(--muted)]">
                    Minimal structural impact — this person is not a critical dependency.
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </motion.div>
  );
}
