"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getMetricsOverview, getWaste } from "@/lib/api";
import type { WasteEntry } from "@/lib/types";

// cost model constants — visible to user in methodology section
const EMAILS_PER_YEAR = 8_000;   // avg emails sent per person per year (industry standard)
const MAX_WASTE_HRS = 500;        // hrs/year at waste_score=100 (2hrs/day email × 250 days)
const ORG_DISCOUNT = 0.40;        // top-20 over-represents high waste; scale down to org avg
const USD_RATE = 1.08;            // EUR → USD conversion

// waste_score component weights (mirrors waste.py formula)
const WEIGHTS = {
  overproduction: 0.30,
  broadcast: 0.30,
  orphan: 0.20,
  replyAll: 0.20,
};

type Currency = "EUR" | "USD";

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function formatMoney(val: number, currency: Currency): string {
  const sym = currency === "EUR" ? "€" : "$";
  if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${sym}${(val / 1_000).toFixed(0)}k`;
  return `${sym}${Math.round(val)}`;
}

interface Breakdown {
  broadcast: number;
  overcc: number;
  orphan: number;
  replyAll: number;
  totalHrs: number;
  totalCost: number;
}

function computeCost(people: WasteEntry[], nodeCount: number, rate: number, currency: Currency): Breakdown {
  const usdFactor = currency === "USD" ? USD_RATE : 1;

  // org-wide averages from top-20, discounted to represent full org
  const orgAvgScore = avg(people.map(p => p.waste_score)) * ORG_DISCOUNT;

  // total wasted hours across the whole org
  const hrsPerPerson = (orgAvgScore / 100) * MAX_WASTE_HRS;
  const totalHrs = hrsPerPerson * nodeCount;

  // split total cost by formula weights
  const totalCost = totalHrs * rate * usdFactor;
  return {
    broadcast: totalCost * WEIGHTS.broadcast,
    overcc: totalCost * WEIGHTS.overproduction,
    orphan: totalCost * WEIGHTS.orphan,
    replyAll: totalCost * WEIGHTS.replyAll,
    totalHrs,
    totalCost,
  };
}

interface CategoryCardProps {
  label: string;
  description: string;
  cost: number;
  pct: number;
  currency: Currency;
}

function CategoryCard({ label, description, cost, pct, currency }: CategoryCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-1 text-sm font-semibold">{label}</div>
      <div className="mb-3 text-[11px] text-[var(--muted)]">{description}</div>
      <div className="mb-2 text-2xl font-bold">{formatMoney(cost, currency)}</div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full bg-[var(--foreground)]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-right font-mono text-[10px] text-[var(--muted)]">{pct.toFixed(0)}% of total</div>
    </div>
  );
}

export default function CostPage() {
  const [people, setPeople] = useState<WasteEntry[]>([]);
  const [nodeCount, setNodeCount] = useState(4555);
  const [busy, setBusy] = useState(true);
  const [rate, setRate] = useState(75);
  const [currency, setCurrency] = useState<Currency>("EUR");

  useEffect(() => {
    Promise.all([getWaste(), getMetricsOverview()])
      .then(([waste, overview]) => {
        setPeople(waste.people);
        setNodeCount(overview.health.stats.node_count || 4555);
      })
      .finally(() => setBusy(false));
  }, []);

  const breakdown = useMemo(
    () => computeCost(people, nodeCount, rate, currency),
    [people, nodeCount, rate, currency]
  );

  const sym = currency === "EUR" ? "€" : "$";

  if (busy) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--foreground)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Collaborative Tax Calculator</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Translate communication waste into estimated annual cost. Based on {nodeCount.toLocaleString()} people in your network.
        </p>
      </div>

      {/* controls */}
      <div className="mb-8 flex flex-col gap-5 rounded-xl border border-gray-100 bg-white p-6">
        {/* currency toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Currency</span>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            {(["EUR", "USD"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  currency === c
                    ? "bg-[var(--foreground)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* rate slider */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Average hourly employee cost</span>
            <span className="font-mono text-lg font-bold">{sym}{rate}/hr</span>
          </div>
          <input
            type="range"
            min={25}
            max={250}
            step={5}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-[var(--foreground)]"
          />
          <div className="mt-1 flex justify-between text-[11px] text-[var(--muted)]">
            <span>{sym}25</span>
            <span>{sym}250</span>
          </div>
        </div>

        {/* manual input */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--muted)]">or enter exact rate:</span>
          <div className="flex items-center rounded-md border border-gray-200 px-2">
            <span className="text-sm text-[var(--muted)]">{sym}</span>
            <input
              type="number"
              min={1}
              max={999}
              value={rate}
              onChange={(e) => setRate(Math.max(1, Math.min(999, Number(e.target.value))))}
              className="w-16 bg-transparent py-1.5 pl-1 text-sm outline-none"
            />
            <span className="text-sm text-[var(--muted)]">/hr</span>
          </div>
        </div>
      </div>

      {/* headline */}
      <motion.div
        key={breakdown.totalCost.toFixed(0)}
        initial={{ opacity: 0.6, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-8 rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center"
      >
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
          Estimated annual communication waste
        </div>
        <div className="text-5xl font-bold tracking-tight">
          {formatMoney(breakdown.totalCost, currency)}
        </div>
        <div className="mt-2 text-sm text-[var(--muted)]">
          {Math.round(breakdown.totalHrs).toLocaleString()} hours wasted per year across {nodeCount.toLocaleString()} employees
        </div>
        <div className="mt-1 text-xs text-[var(--muted)]">
          ≈ {Math.round(breakdown.totalHrs / nodeCount)} hrs per person · {sym}{rate}/hr · {currency}
        </div>
      </motion.div>

      {/* category breakdown */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Breakdown by category</h2>
        <div className="grid grid-cols-2 gap-3">
          <CategoryCard
            label="Broadcast overload"
            description="Mass emails and reply-all storms landing in inboxes that didn't need them"
            cost={breakdown.broadcast}
            pct={WEIGHTS.broadcast * 100}
            currency={currency}
          />
          <CategoryCard
            label="CC overproduction"
            description="Excess CC recipients creating read-time for emails that don't require action"
            cost={breakdown.overcc}
            pct={WEIGHTS.overproduction * 100}
            currency={currency}
          />
          <CategoryCard
            label="Orphaned messages"
            description="Emails written and sent that generated no response — meetings that could have been skipped"
            cost={breakdown.orphan}
            pct={WEIGHTS.orphan * 100}
            currency={currency}
          />
          <CategoryCard
            label="Reply-all abuse"
            description="Reply-all emails sent to threads where only 1–2 people needed the response"
            cost={breakdown.replyAll}
            pct={WEIGHTS.replyAll * 100}
            currency={currency}
          />
        </div>
      </div>

      {/* top wasters */}
      {people.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">Highest-waste communicators</h2>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-[var(--muted)]">
                  <th className="px-4 py-3 text-left font-medium">Person</th>
                  <th className="px-4 py-3 text-right font-medium">Waste score</th>
                  <th className="px-4 py-3 text-right font-medium">Broadcast</th>
                  <th className="px-4 py-3 text-right font-medium">Orphan rate</th>
                  <th className="px-4 py-3 text-right font-medium">Est. cost/yr</th>
                </tr>
              </thead>
              <tbody>
                {people.slice(0, 8).map((p) => {
                  // individual estimate: their waste_score applied to one person's email year
                  const indivHrs = (p.waste_score / 100) * MAX_WASTE_HRS;
                  const indivCost = indivHrs * rate * (currency === "USD" ? USD_RATE : 1);
                  return (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.waste_score.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--muted)]">{(p.broadcast_ratio * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--muted)]">{(p.orphan_ratio * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatMoney(indivCost, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* methodology */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-xs text-[var(--muted)]">
        <div className="mb-2 font-semibold uppercase tracking-wider">Methodology</div>
        <p className="mb-1">
          Waste ratios (broadcast, reply-all, orphan, overproduction) are derived from actual email corpus analysis of {nodeCount.toLocaleString()} people. The top-20 high-waste communicators are used to estimate org-wide averages, discounted by 60% to account for the long tail.
        </p>
        <p className="mb-1">
          Assumes {EMAILS_PER_YEAR.toLocaleString()} emails sent per person per year (industry average) and a maximum of {MAX_WASTE_HRS} hours/year of email-related time at waste_score=100.
        </p>
        <p>
          Formula: <span className="font-mono">cost = (orgAvgWaste/100) × {MAX_WASTE_HRS}hrs × headcount × hourlyRate</span>
        </p>
      </div>
    </div>
  );
}
