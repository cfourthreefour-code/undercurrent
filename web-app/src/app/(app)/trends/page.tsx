"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fetchTrends } from "@/lib/api";
import type { TrendItem, TrendsData } from "@/lib/types";

function Card({
  title,
  items,
  onItemClick,
}: {
  title: string;
  items: TrendItem[];
  onItemClick: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-white">
      <div className="border-b border-[var(--card-border)] px-5 py-4">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((item) => (
          <button
            key={item.person_id + item.metric}
            onClick={() => onItemClick(item.person_id)}
            className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <div>
              <p className="text-sm font-medium">{item.person_name}</p>
              <p className="text-xs text-[var(--muted)]">{item.metric}</p>
            </div>
            <span
              className={`font-medium font-mono text-sm ${
                item.delta_pct > 0
                  ? "text-green-600"
                  : item.delta_pct < 0
                    ? "text-red-600"
                    : "text-[var(--muted)]"
              }`}
            >
              {item.delta_pct > 0 ? "▲" : item.delta_pct < 0 ? "▼" : "–"}{" "}
              {Math.abs(item.delta_pct)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const router = useRouter();
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    fetchTrends()
      .then((d) => { setTrends(d); setBusy(false); })
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

  if (!trends) {
    return <div className="py-12 text-center text-[var(--muted)]">Failed to load trends data.</div>;
  }

  return (
    <motion.div
      className="mx-auto max-w-5xl space-y-6 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trends</h2>
        <span className="text-xs text-[var(--muted)]">Last 30 days vs Prior 30 days (heuristic)</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Structural Shifts" items={trends.structural_shifts} onItemClick={goTo} />
        <Card title="Communication Shifts" items={trends.communication_shifts} onItemClick={goTo} />
        <Card title="Workstream Shifts" items={trends.workstream_shifts} onItemClick={goTo} />
      </div>
    </motion.div>
  );
}
