"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Search } from "lucide-react";
import { getPeople } from "@/lib/api";
import type { PersonSummary } from "@/lib/types";

type Col = "name" | "betweenness" | "pagerank" | "eigenvector" | "dms_score" | "total_sent" | "total_received";

const COLS: { key: Col; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "pagerank", label: "PageRank" },
  { key: "betweenness", label: "Betweenness" },
  { key: "eigenvector", label: "Eigenvector" },
  { key: "total_sent", label: "Sent" },
  { key: "total_received", label: "Received" },
  { key: "dms_score", label: "Risk Score" },
];

const PG = 50;

function RiskIcon({ score, all }: { score: number; all: number[] }) {
  if (!all.length) return null;
  const sorted = [...all].sort((a, b) => b - a);
  const t5 = sorted[Math.floor(sorted.length * 0.05)] ?? 0;
  const t15 = sorted[Math.floor(sorted.length * 0.15)] ?? 0;

  if (score >= t5) return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  if (score >= t15) return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
  return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
}

export default function PeoplePage() {
  const router = useRouter();
  const [rows, setRows] = useState<PersonSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [q, setQ] = useState("");
  const [col, setCol] = useState<Col>("betweenness");
  const [asc, setAsc] = useState(false);
  const [pg, setPg] = useState(1);

  useEffect(() => {
    getPeople()
      .then((d) => { setRows(d.people); setBusy(false); })
      .catch((err) => { console.error("people load failed:", err); setBusy(false); });
  }, []);

  const scores = rows.map((r) => r.dms_score);

  const sort = (key: Col) => {
    if (col === key) {
      setAsc(!asc);
    } else {
      setCol(key);
      setAsc(key === "name");
    }
  };

  const visible = rows
    .filter((r) =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.email.toLowerCase().includes(q.toLowerCase())
    )
    .sort((a, b) => {
      const dir = asc ? 1 : -1;
      if (col === "name") return a.name.localeCompare(b.name) * dir;
      return ((a[col] as number) - (b[col] as number)) * dir;
    });

  const shown = visible.slice(0, pg * PG);

  if (busy) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--foreground)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex w-72 items-center gap-2 rounded-lg border border-[var(--card-border)] bg-white px-3 py-2">
          <Search className="h-4 w-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPg(1); }}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <span className="text-sm text-[var(--muted)]">{visible.length} people</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th
                  className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                  onClick={() => sort("name")}
                >
                  <span className="inline-flex items-center gap-1">
                    Name
                    {col === "name" && (asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Since</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted)]">Alert</th>

                {COLS.filter((c) => c.key !== "name").map((c) => (
                  <th
                    key={c.key}
                    className="cursor-pointer select-none px-4 py-3 text-left text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                    onClick={() => sort(c.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {col === c.key && (asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50"
                  onClick={() => router.push(`/graph?focus=${encodeURIComponent(p.id)}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--muted)]">{p.email}</td>
                  <td className="px-4 py-3 text-sm text-[var(--muted)]">{p.first_seen || "--"}</td>
                  <td className="px-4 py-3 text-center">
                    <RiskIcon score={p.dms_score} all={scores} />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{p.pagerank.toFixed(5)}</td>
                  <td className="px-4 py-3 font-mono text-sm">{p.betweenness.toFixed(5)}</td>
                  <td className="px-4 py-3 font-mono text-sm">{p.eigenvector.toFixed(5)}</td>
                  <td className="px-4 py-3 font-mono text-sm">{p.total_sent}</td>
                  <td className="px-4 py-3 font-mono text-sm">{p.total_received}</td>
                  <td className="px-4 py-3 font-mono text-sm">{p.dms_score.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {shown.length < visible.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setPg((n) => n + 1)}
            className="rounded-lg border border-[var(--card-border)] px-6 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-gray-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
