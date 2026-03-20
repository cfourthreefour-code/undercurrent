import { Check, Plug, TrendingUp, Zap } from "lucide-react";

// --- comparison table data ---

const COMPETITORS = [
  { name: "Undercurrent", highlight: true },
  { name: "McKinsey OHI" },
  { name: "Microsoft Viva" },
  { name: "Culture Amp" },
];

type Cell = { text: string; good?: boolean; bad?: boolean };

const COMPARISON_ROWS: { label: string; cells: Cell[] }[] = [
  {
    label: "Data source",
    cells: [
      { text: "Actual email graph", good: true },
      { text: "Surveys" },
      { text: "Calendar + meetings" },
      { text: "Surveys" },
    ],
  },
  {
    label: "Time to insight",
    cells: [
      { text: "Minutes", good: true },
      { text: "3–6 months", bad: true },
      { text: "Weeks", bad: true },
      { text: "Weeks", bad: true },
    ],
  },
  {
    label: "Cost",
    cells: [
      { text: "€2–12 / seat / mo", good: true },
      { text: "$500K+ engagement", bad: true },
      { text: "$6–12 / seat / mo" },
      { text: "$5–11 / seat / mo" },
    ],
  },
  {
    label: "Objectivity",
    cells: [
      { text: "Behavioural data", good: true },
      { text: "Self-reported", bad: true },
      { text: "Partial", },
      { text: "Self-reported", bad: true },
    ],
  },
  {
    label: "AI Q&A",
    cells: [
      { text: "✓ GraphRAG", good: true },
      { text: "✗", bad: true },
      { text: "✗", bad: true },
      { text: "✗", bad: true },
    ],
  },
  {
    label: "Graph analytics",
    cells: [
      { text: "✓ Full graph", good: true },
      { text: "✗", bad: true },
      { text: "Partial" },
      { text: "✗", bad: true },
    ],
  },
  {
    label: "Continuous monitoring",
    cells: [
      { text: "✓ Real-time", good: true },
      { text: "Annual survey" , bad: true },
      { text: "✓" },
      { text: "Quarterly" },
    ],
  },
  {
    label: "\"What If?\" simulation",
    cells: [
      { text: "✓ Built-in", good: true },
      { text: "✗", bad: true },
      { text: "✗", bad: true },
      { text: "✗", bad: true },
    ],
  },
];

// --- pricing tiers ---

const TIERS = [
  {
    name: "Starter",
    price: "€2",
    period: "/ employee / month",
    tagline: "Everything you need to start understanding your org.",
    highlight: false,
    features: [
      "Org health score (0–100)",
      "Community detection",
      "Force-directed graph view",
      "Basic health report",
      "Top 10 bottleneck alerts",
      "Email corpus ingestion",
    ],
    cta: "Request access",
  },
  {
    name: "Growth",
    price: "€5",
    period: "/ employee / month",
    tagline: "Intelligence that drives decisions, not just awareness.",
    highlight: true,
    features: [
      "Everything in Starter",
      "GraphRAG AI Q&A",
      "Communication waste analysis",
      "\"What If?\" departure simulator",
      "Collaborative tax calculator",
      "Sentiment landscape",
      "Advanced diagnostic reports",
      "People detail panels",
    ],
    cta: "Request a demo",
  },
  {
    name: "Enterprise",
    price: "€12",
    period: "/ employee / month",
    tagline: "For organisations that need custom scale and security.",
    highlight: false,
    features: [
      "Everything in Growth",
      "SSO / SAML integration",
      "API access",
      "Custom data connectors",
      "Dedicated support",
      "99.9% SLA",
      "On-premise deployment option",
      "Custom reporting",
    ],
    cta: "Talk to sales",
  },
];

// --- how it works ---

const STEPS = [
  {
    icon: Plug,
    title: "Connect",
    body: "Ingest your email corpus — Outlook, Gmail, or raw maildir. No third-party data ever leaves your infrastructure.",
  },
  {
    icon: Zap,
    title: "Analyze",
    body: "Graph algorithms, Louvain community detection, and centrality metrics run in minutes across millions of messages.",
  },
  {
    icon: TrendingUp,
    title: "Act",
    body: "Get the org map, bottleneck alerts, AI Q&A, departure simulations, and cost estimates — all in one dashboard.",
  },
];

// --- page ---

export default function PricingPage() {
  return (
    <div className="min-h-screen">

      {/* HERO — dark */}
      <section className="bg-[var(--foreground)] px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-block rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/60">
            Organizational Intelligence Platform
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Stop paying consultants.<br />Start using math.
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/70">
            Undercurrent replaces $500K consulting engagements with instant,
            data-driven organizational intelligence.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button className="rounded-lg bg-white px-6 py-3 font-semibold text-[var(--foreground)] transition-opacity hover:opacity-90">
              Request a Demo
            </button>
            <button className="rounded-lg border border-white/30 px-6 py-3 font-medium text-white/80 transition-colors hover:border-white/60 hover:text-white">
              View the graph →
            </button>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-2xl font-bold">How we compare</h2>
          <p className="mb-10 text-center text-sm text-[var(--muted)]">
            The same questions, answered without a six-month engagement.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 pb-4 pr-4 text-left font-medium text-[var(--muted)]"></th>
                  {COMPETITORS.map((c) => (
                    <th
                      key={c.name}
                      className={`border-b pb-4 px-4 text-center font-semibold ${
                        c.highlight
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-white rounded-t-xl"
                          : "border-gray-200 text-[var(--foreground)]"
                      }`}
                    >
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, ri) => (
                  <tr key={row.label} className={ri % 2 === 0 ? "bg-gray-50/50" : ""}>
                    <td className="py-3 pr-4 font-medium text-[var(--muted)]">{row.label}</td>
                    {row.cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-4 py-3 text-center text-sm ${
                          ci === 0
                            ? "bg-[var(--foreground)]/5 font-medium text-[var(--foreground)]"
                            : ""
                        } ${cell.good ? "text-[var(--foreground)]" : ""} ${cell.bad ? "text-[var(--muted)]" : ""}`}
                      >
                        {cell.text}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING TIERS */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-2xl font-bold">Simple, transparent pricing</h2>
          <p className="mb-10 text-center text-sm text-[var(--muted)]">
            No implementation fees. No 6-month lock-ins. Cancel anytime.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`flex flex-col rounded-2xl border p-6 ${
                  tier.highlight
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-white shadow-xl"
                    : "border-gray-200 bg-white"
                }`}
              >
                {tier.highlight && (
                  <div className="mb-4 self-start rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">
                    Most popular
                  </div>
                )}

                <div className="mb-1 text-lg font-bold">{tier.name}</div>
                <div className="mb-1 flex items-end gap-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className={`mb-1 text-xs ${tier.highlight ? "text-white/60" : "text-[var(--muted)]"}`}>
                    {tier.period}
                  </span>
                </div>
                <p className={`mb-6 text-sm ${tier.highlight ? "text-white/70" : "text-[var(--muted)]"}`}>
                  {tier.tagline}
                </p>

                <ul className="mb-8 flex-1 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                          tier.highlight ? "text-white/80" : "text-[var(--foreground)]"
                        }`}
                      />
                      <span className={tier.highlight ? "text-white/90" : ""}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${
                    tier.highlight
                      ? "bg-white text-[var(--foreground)]"
                      : "border border-gray-200 bg-white text-[var(--foreground)] hover:border-gray-400"
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-[var(--muted)]">
            Pricing based on active employees in the email graph. Annual billing available at 20% discount.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-2xl font-bold">How it works</h2>
          <p className="mb-12 text-center text-sm text-[var(--muted)]">
            From raw email data to org intelligence in minutes.
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--foreground)]">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
                    Step {i + 1}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-[var(--muted)]">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-y border-gray-100 bg-gray-50 px-6 py-10">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { val: "4,555", label: "Employees mapped" },
            { val: "11,661", label: "Relationships analysed" },
            { val: "< 5 min", label: "Time to insight" },
            { val: "€0", label: "Consultant fees" },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold">{val}</div>
              <div className="text-xs text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — dark */}
      <section className="bg-[var(--foreground)] px-6 py-20 text-white">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-3 text-3xl font-bold">Ready to see your org clearly?</h2>
          <p className="mb-8 text-white/70">
            One email corpus. Zero surveys. Instant intelligence.
          </p>
          <button className="rounded-lg bg-white px-8 py-3 font-semibold text-[var(--foreground)] transition-opacity hover:opacity-90">
            Request a Demo
          </button>
          <p className="mt-4 text-xs text-white/40">
            No commitment. Setup in under 10 minutes.
          </p>
        </div>
      </section>

    </div>
  );
}
