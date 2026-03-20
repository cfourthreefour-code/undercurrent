"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Shield, Trash2 } from "lucide-react";
import { fetchRisks } from "@/lib/api";
import type { RisksData } from "@/lib/types";

function badge(severity: string) {
  if (severity === "Critical") return "bg-red-50 text-red-700";
  if (severity === "High") return "bg-orange-50 text-orange-700";
  return "bg-yellow-50 text-yellow-700";
}

export default function RisksPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<RisksData | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    fetchRisks()
      .then((d) => { setRisks(d); setBusy(false); })
      .catch(() => setBusy(false));
  }, []);

  const goTo = (id: string) => router.push(`/graph?focus=${encodeURIComponent(id)}`);

  if (busy) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--foreground)]" />
      </div>
    );
  }

  if (!risks) {
    return <div className="py-12 text-center text-[var(--muted)]">Failed to load risks data.</div>;
  }

  return (
    <motion.div
      className="mx-auto max-w-5xl space-y-6 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="text-lg font-semibold">Risks</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* high-risk nodes */}
        <div className="rounded-xl border border-[var(--card-border)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--card-border)] px-5 py-4">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold">High-Risk Nodes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {risks.high_risk_nodes.map((n) => (
              <button
                key={n.id}
                onClick={() => goTo(n.id)}
                className="w-full px-5 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{n.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(n.risk_label)}`}>
                    {n.risk_label}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">{n.key_vulnerability}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Impact: {n.impact_pct}% | Score: {n.risk_score.toFixed(3)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* structural risks */}
        <div className="rounded-xl border border-[var(--card-border)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--card-border)] px-5 py-4">
            <Shield className="h-4 w-4 text-[var(--muted)]" />
            <h3 className="text-sm font-semibold">Structural Risks</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {risks.structural_risks.map((r) => (
              <div key={r.label} className="px-5 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(r.severity)}`}>
                    {r.severity}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">{r.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* waste */}
        <div className="rounded-xl border border-[var(--card-border)] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--card-border)] px-5 py-4">
            <Trash2 className="h-4 w-4 text-[var(--muted)]" />
            <h3 className="text-sm font-semibold">Communication Waste</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {risks.communication_waste.map((w) => (
              <button
                key={w.id}
                onClick={() => goTo(w.id)}
                className="w-full px-5 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{w.name}</span>
                  <span className="font-mono text-xs">{w.waste_score.toFixed(1)}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-xs text-[var(--muted)]">
                  <span>Overproduction: {w.overproduction.toFixed(1)} avg recipients</span>
                  <span>Reply-all ratio: {(w.reply_all_ratio * 100).toFixed(0)}%</span>
                  <span>Response gap: {(w.response_gap * 100).toFixed(0)}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
