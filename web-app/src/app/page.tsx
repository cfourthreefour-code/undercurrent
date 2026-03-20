"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertCircle, CheckCircle, Database, FileText, FolderOpen,
  Loader2, Plug, TrendingUp, Upload, Zap,
} from "lucide-react";

const GraphPreview = dynamic(() => import("@/components/ui/GraphPreview"), { ssr: false });
import HeroWaves from "@/components/ui/HeroWaves";
import WaveDivider from "@/components/ui/WaveDivider";

// ── upload pipeline (unchanged) ──────────────────────────────────

const STEPS = [
  { label: "Parsing emails...", duration: 1200 },
  { label: "Building communication graph...", duration: 1500 },
  { label: "Computing centrality metrics...", duration: 1000 },
  { label: "Detecting communities...", duration: 800 },
  { label: "Analyzing sentiment...", duration: 1200 },
  { label: "Computing health score...", duration: 600 },
  { label: "Preparing graph view...", duration: 500 },
];

const ENRON_HINTS = ["enron", "maildir", "skilling", "lay", "fastow"];

function isEnronData(files: FileList | File[]): boolean {
  return Array.from(files).some((f) =>
    ENRON_HINTS.some((kw) => f.name.toLowerCase().includes(kw))
  );
}

function errorFor(files: FileList | File[]): { title: string; detail: string } {
  const arr = Array.from(files);
  const names = arr.map((f) => f.name.toLowerCase());
  const size = arr.reduce((s, f) => s + f.size, 0);

  const validExt = names.some(
    (n) => n.endsWith(".mbox") || n.endsWith(".pst") || n.endsWith(".eml") ||
           n.endsWith(".zip") || n.endsWith(".tar.gz") || n.endsWith(".gz")
  );

  if (!validExt) {
    return {
      title: "Unsupported format",
      detail: "Expected .mbox, .pst, .eml, or compressed maildir archive. The uploaded file type is not recognized as a supported email corpus.",
    };
  }

  if (size < 5 * 1024 * 1024) {
    return {
      title: "Corpus too small",
      detail: "Undercurrent requires a minimum of ~10,000 messages to generate meaningful organizational insights. The uploaded dataset appears too small to analyze.",
    };
  }

  return {
    title: "Unable to parse corpus",
    detail: "The email archive could not be parsed. Please ensure it is a valid email corpus export in .mbox, .pst, or maildir format.",
  };
}

// ── page ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [err, setErr] = useState<{ title: string; detail: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const begin = () => {
    setRunning(true);
    setErr(null);
    let i = 0;

    const next = () => {
      if (i >= STEPS.length) {
        setTimeout(() => router.push("/graph"), 500);
        return;
      }
      setStep(i);
      i++;
      setTimeout(next, STEPS[i - 1].duration);
    };
    next();
  };

  const onFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setFileName(arr.length === 1 ? arr[0].name : `${arr.length} files selected`);
    if (isEnronData(arr)) {
      begin();
    } else {
      setErr(errorFor(arr));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onFiles(e.target.files);
  };

  return (
    <div className="bg-[#0a0a0f]">

      {/* ═══════════ SECTION 1 — HERO ═══════════ */}
      <section className="relative h-screen overflow-hidden">

        {/* RIGHT — live graph filling the right 50% of viewport, full bleed */}
        <motion.div
          className="absolute top-0 right-0 bottom-0 hidden lg:block"
          style={{ width: "50%" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        >
          <GraphPreview />
        </motion.div>

        {/* gradient fade: dark bg bleeds over the left edge of the graph */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10 hidden lg:block"
          style={{
            left: "30%",
            width: "30%",
            background: "linear-gradient(90deg, #0a0a0f 0%, #0a0a0f 20%, rgba(10,10,15,0) 100%)",
          }}
        />

        {/* ambient ocean waves — above gradient fade, below text */}
        <div className="pointer-events-none absolute inset-0 z-[15]">
          <HeroWaves />
        </div>

        {/* LEFT — copy + CTAs, pushed toward top */}
        <div className="relative z-20 flex h-full flex-col" style={{ justifyContent: "flex-start", paddingTop: "15vh" }}>
          <div className="w-full px-8 lg:w-[55%] lg:px-16 xl:px-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* brand — massive, dominant, separated from headline */}
              <div
                className="mb-8 font-bold tracking-tight text-white lg:mb-10"
                style={{ fontSize: "clamp(56px, 7vw, 96px)", lineHeight: 1 }}
              >
                UnderCurrent
              </div>

              {/* headline — clear hierarchy below brand */}
              <h1
                className="mb-6 font-bold leading-[1.1] tracking-tight text-white"
                style={{ fontSize: "clamp(32px, 3.8vw, 56px)" }}
              >
                See your real org chart.{" "}
                <br className="hidden sm:block" />
                In 5 minutes.{" "}
                <br className="hidden sm:block" />
                <span className="text-white/40">Not 6 months.</span>
              </h1>

              {/* punchy comparison — scannable value prop */}
              <div className="mb-8 max-w-xl space-y-3" style={{ fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 1.4 }}>
                <p className="text-white/35 line-through decoration-white/20">
                  McKinsey: $500K, 6 months, subjective surveys
                </p>
                <p className="font-semibold text-[#00d4aa]">
                  UnderCurrent: $0 to start, 5 minutes, real behavioral data
                </p>
              </div>

              <div className="mb-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/graph"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#00d4aa] px-8 py-3.5 text-base font-bold text-[#0a0a0f] transition-all hover:opacity-90"
                  style={{ boxShadow: "0 0 20px rgba(0,212,170,0.3), 0 0 60px rgba(0,212,170,0.15)" }}
                >
                  Explore the Demo
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:text-white"
                >
                  See Pricing
                </Link>
              </div>

              <div className="relative z-30 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/30">
                <span>4,555 people mapped</span>
                <span>11,661 relationships</span>
                <span>&lt;5 min to insight</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* mobile: show graph behind text at lower opacity */}
        <div className="absolute inset-0 lg:hidden" style={{ opacity: 0.3 }}>
          <GraphPreview />
        </div>
      </section>

      {/* flowing current divider — visual bridge between hero and content */}
      <WaveDivider />

      {/* ═══════════ SECTION 2 — BELOW THE FOLD ═══════════ */}

      {/* comparison table */}
      <section className="border-t border-white/5 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-white/40">
            vs. the alternatives
          </p>
          <h2 className="mb-12 text-center text-3xl font-bold leading-tight text-white">
            McKinsey charges $500K.<br />This takes 5 minutes.
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 pr-6 text-left font-normal text-white/40" />
                  {[
                    { label: "UnderCurrent", hl: true },
                    { label: "McKinsey OHI", hl: false },
                    { label: "Microsoft Viva", hl: false },
                    { label: "Culture Amp", hl: false },
                  ].map(({ label, hl }) => (
                    <th key={label} className={`pb-3 px-4 text-center font-semibold ${hl ? "text-white" : "text-white/40"}`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Data source",       cells: ["Email graph", "Surveys", "Calendar", "Surveys"] },
                  { label: "Time to insight",   cells: ["Minutes", "3–6 months", "Weeks", "Weeks"] },
                  { label: "Cost",              cells: ["€2–12/seat/mo", "$500K+", "$6–12/seat", "$5–11/seat"] },
                  { label: "AI Q&A",            cells: ["✓ GraphRAG", "✗", "✗", "✗"] },
                  { label: "What-If simulator", cells: ["✓ Built-in", "✗", "✗", "✗"] },
                  { label: "Objectivity",       cells: ["Behavioural", "Self-reported", "Partial", "Self-reported"] },
                ].map((row, ri) => (
                  <tr key={row.label} className={ri % 2 === 0 ? "bg-white/[0.03]" : ""}>
                    <td className="py-3 pr-6 text-white/50">{row.label}</td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className={`px-4 py-3 text-center ${ci === 0 ? "font-semibold text-white" : "text-white/35"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* pricing tiers */}
      <section className="border-t border-white/5 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-white">Simple pricing</h2>
          <p className="mb-10 text-center text-sm text-white/40">Per employee, per month. No lock-ins.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                name: "Starter", price: "€2", hl: false,
                features: ["Org health score", "Community detection", "Graph visualisation", "Basic reports"],
              },
              {
                name: "Growth", price: "€5", hl: true,
                features: ["Everything in Starter", "GraphRAG AI Q&A", "What-If simulator", "Waste & cost analysis", "Advanced reports"],
              },
              {
                name: "Enterprise", price: "€12", hl: false,
                features: ["Everything in Growth", "SSO / API access", "Custom integrations", "Dedicated support & SLA"],
              },
            ].map(({ name, price, hl, features }) => (
              <div key={name} className={`rounded-2xl p-6 ${hl ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white"}`}>
                {hl && <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Most popular</div>}
                <div className="mb-0.5 font-semibold">{name}</div>
                <div className="mb-4 text-2xl font-bold">{price}<span className={`ml-1 text-xs font-normal ${hl ? "text-black/40" : "text-white/30"}`}>/employee/mo</span></div>
                <ul className="space-y-1.5 text-sm">
                  {features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 ${hl ? "text-black/80" : "text-white/50"}`}>
                      <span className="mt-0.5 text-[10px]">✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="border-t border-white/5 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-white">How it works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { Icon: Plug,       step: "01", title: "Connect",  body: "Ingest your email corpus. Nothing leaves your infrastructure." },
              { Icon: Zap,        step: "02", title: "Analyze",  body: "Graph algorithms and AI run across millions of messages in minutes." },
              { Icon: TrendingUp, step: "03", title: "Act",      body: "Get the org map, bottleneck alerts, AI Q&A, and cost estimates." },
            ].map(({ Icon, step, title, body }) => (
              <div key={title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="mb-1 font-mono text-[10px] text-white/30">{step}</div>
                <div className="mb-2 font-semibold text-white">{title}</div>
                <p className="text-sm text-white/40">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 3 — UPLOAD ═══════════ */}
      <section className="border-t border-white/5 px-6 py-16">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-white">Try it yourself</h2>
          <p className="mb-8 text-center text-sm text-white/40">
            Upload your own email corpus, or explore the Enron demo dataset.
          </p>

          <AnimatePresence mode="wait">
            {!running ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".mbox,.pst,.eml,.zip,.tar.gz,.gz"
                  multiple
                  onChange={onFileChange}
                />

                {/* drop zone — dark-themed */}
                <div
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 backdrop-blur-sm transition-colors ${
                    dragging
                      ? "border-[#00d4aa] bg-white/10"
                      : err
                        ? "border-red-500/40 bg-white/5"
                        : "border-white/15 bg-white/5 hover:border-white/30"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <AnimatePresence mode="wait">
                    {!err ? (
                      <motion.div
                        key="default"
                        className="py-6 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                          <Upload className="h-6 w-6 text-white/50" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-white">Import email corpus</h3>
                        <p className="mb-4 text-sm text-white/40">Drag and drop or click to browse</p>
                        <div className="flex items-center justify-center gap-4 text-xs text-white/30">
                          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />.mbox</span>
                          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />.pst</span>
                          <span className="flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" />maildir</span>
                        </div>
                        <p className="mt-4 text-[11px] text-white/25">
                          Processed locally — never leaves your infrastructure
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="error"
                        className="py-6 text-center"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                          <AlertCircle className="h-6 w-6 text-red-400" />
                        </div>
                        <h3 className="mb-1 text-lg font-semibold text-red-400">{err.title}</h3>
                        <p className="mx-auto mb-4 max-w-sm text-sm text-white/40">{err.detail}</p>
                        {fileName && <p className="text-xs text-white/20">{fileName}</p>}
                        <button
                          className="mt-4 text-sm text-white/40 underline underline-offset-2 transition-colors hover:text-white/70"
                          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                        >
                          Try a different file
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs font-medium uppercase tracking-wider text-white/25">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <motion.button
                  onClick={begin}
                  className="group w-full cursor-pointer rounded-xl border border-white/15 bg-white/5 px-6 py-4 transition-all hover:border-white/30 hover:bg-white/10"
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-white/15">
                        <Database className="h-4.5 w-4.5 text-white/60" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-white">Explore with Enron data</div>
                        <div className="text-xs text-white/35">Enron corpus — 121,543 emails, 4,555 employees</div>
                      </div>
                    </div>
                    <span className="text-xs text-white/30 transition-colors group-hover:text-white/60">→</span>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {err && (
                    <motion.p
                      className="mt-3 text-center text-xs text-white/30"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      Having trouble? Try the sample dataset above to explore UnderCurrent&apos;s capabilities.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rounded-2xl border border-white/15 bg-white/5 p-8">
                  <div className="mb-6 flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                    <h3 className="text-lg font-semibold text-white">Analyzing...</h3>
                  </div>

                  <div className="space-y-2.5">
                    {STEPS.map((s, i) => (
                      <motion.div
                        key={s.label}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: i <= step ? 1 : 0.3, x: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.2 }}
                      >
                        {i < step ? (
                          <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-400" />
                        ) : i === step ? (
                          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-white" />
                        ) : (
                          <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-white/15" />
                        )}
                        <span className={`text-sm ${i <= step ? "text-white" : "text-white/25"}`}>
                          {s.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* final CTA */}
      <section className="border-t border-white/5 px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-3 text-3xl font-bold text-white">Ready to see your org clearly?</h2>
          <p className="mb-8 text-white/40">
            One email corpus. Zero surveys. Instant intelligence.
          </p>
          <Link
            href="/graph"
            className="inline-block rounded-lg bg-[#00d4aa] px-8 py-3 font-semibold text-[#0a0a0f] transition-opacity hover:opacity-90"
          >
            Explore the Demo
          </Link>
          <p className="mt-4 text-xs text-white/20">
            No commitment. Setup in under 10 minutes.
          </p>
        </div>
      </section>

    </div>
  );
}
