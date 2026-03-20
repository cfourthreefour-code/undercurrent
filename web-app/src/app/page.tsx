"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { AlertCircle, CheckCircle, Database, FileText, FolderOpen, Loader2, Plug, TrendingUp, Upload, Zap } from "lucide-react";

const Background = dynamic(() => import("@/components/ui/shader-animation"), { ssr: false });

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
    <div>
    <div className="relative min-h-screen overflow-hidden">
      <Background />

      {/* wordmark */}
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-16 z-10 flex justify-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <h1
          className="text-[56pt] font-bold tracking-tight"
          style={{
            color: "white",
            mixBlendMode: "difference",
            textShadow: "0 0 60px rgba(255,255,255,0.3), 0 0 120px rgba(255,255,255,0.1)",
          }}
        >
          Undercurrent
        </h1>
      </motion.div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {!running ? (
            <motion.div
              key="upload"
              className="w-full max-w-2xl"
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

              {/* drop zone */}
              <div
                className={`cursor-pointer rounded-2xl border-2 border-dashed bg-white/90 p-8 backdrop-blur-sm transition-colors ${
                  dragging
                    ? "border-[var(--foreground)] bg-white/95"
                    : err
                      ? "border-red-300 hover:border-red-400"
                      : "border-gray-300 hover:border-gray-500"
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
                      className="py-8 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                        <Upload className="h-7 w-7 text-[var(--muted)]" />
                      </div>
                      <h2 className="mb-2 text-xl font-semibold">Import email corpus</h2>
                      <p className="mb-4 text-sm text-[var(--muted)]">Drag and drop or click to browse</p>
                      <div className="flex items-center justify-center gap-4 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />.mbox</span>
                        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />.pst</span>
                        <span className="flex items-center gap-1"><FolderOpen className="h-3.5 w-3.5" />maildir</span>
                      </div>
                      <p className="mt-4 text-[11px] text-[var(--muted)]">
                        Processed locally — never leaves your infrastructure
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="error"
                      className="py-8 text-center"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                        <AlertCircle className="h-7 w-7 text-red-500" />
                      </div>
                      <h2 className="mb-1 text-lg font-semibold text-red-600">{err.title}</h2>
                      <p className="mx-auto mb-4 max-w-sm text-sm text-[var(--muted)]">{err.detail}</p>
                      {fileName && (
                        <p className="text-xs text-gray-400">{fileName}</p>
                      )}
                      <button
                        className="mt-4 text-sm text-[var(--muted)] underline underline-offset-2 transition-colors hover:text-[var(--foreground)]"
                        onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                      >
                        Try a different file
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-xs font-medium uppercase tracking-wider text-white/50">or</span>
                <div className="h-px flex-1 bg-white/20" />
              </div>

              <motion.button
                onClick={begin}
                className="group w-full cursor-pointer rounded-xl border border-gray-200 bg-white/90 px-6 py-4 backdrop-blur-sm transition-all hover:border-gray-400 hover:bg-white/95"
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-gray-200">
                      <Database className="h-4.5 w-4.5 text-[var(--foreground)]" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold">Explore with Enron data</div>
                      <div className="text-xs text-[var(--muted)]">Enron corpus — 121,543 emails, 4,555 employees</div>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--muted)] transition-colors group-hover:text-[var(--foreground)]">→</span>
                </div>
              </motion.button>

              <AnimatePresence>
                {err && (
                  <motion.p
                    className="mt-3 text-center text-xs text-white/60"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    Having trouble? Try the sample dataset above to explore Undercurrent&apos;s capabilities.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="processing"
              className="w-full max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-2xl border border-gray-200 bg-white/90 p-8 backdrop-blur-sm">
                <div className="mb-6 flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--foreground)]" />
                  <h2 className="text-lg font-semibold">Analyzing...</h2>
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
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                      ) : i === step ? (
                        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[var(--foreground)]" />
                      ) : (
                        <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-gray-200" />
                      )}
                      <span className={`text-sm ${i <= step ? "text-[var(--foreground)]" : "text-gray-400"}`}>
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
    </div>{/* end hero */}

    {/* ── MARKETING SECTIONS ── dark, scrollable below the hero ── */}
    <div className="bg-black text-white">

      {/* tagline + comparison */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-white/40">vs. the alternatives</p>
        <h2 className="mb-12 text-center text-3xl font-bold leading-tight">
          McKinsey charges $500K.<br />This takes 5 minutes.
        </h2>

        {/* comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-3 pr-6 text-left font-normal text-white/40" />
                {[
                  { label: "Undercurrent", hl: true },
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
      </section>

      {/* pricing tiers */}
      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold">Simple pricing</h2>
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
              <div key={name} className={`rounded-2xl p-6 ${hl ? "bg-white text-black" : "border border-white/10 bg-white/5"}`}>
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
      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-2xl font-bold">How it works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { Icon: Plug,        step: "01", title: "Connect",  body: "Ingest your email corpus. Nothing leaves your infrastructure." },
              { Icon: Zap,         step: "02", title: "Analyze",  body: "Graph algorithms and AI run across millions of messages in minutes." },
              { Icon: TrendingUp,  step: "03", title: "Act",      body: "Get the org map, bottleneck alerts, AI Q&A, and cost estimates." },
            ].map(({ Icon, step, title, body }) => (
              <div key={title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="mb-1 font-mono text-[10px] text-white/30">{step}</div>
                <div className="mb-2 font-semibold">{title}</div>
                <p className="text-sm text-white/40">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>{/* end marketing */}
    </div>
  );
}
