"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, CheckCircle, Database, FileText, FolderOpen,
  Loader2, Upload,
} from "lucide-react";

import HalftoneBackground from "@/components/ui/HalftoneBackground";

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
    <div className="relative h-screen w-screen overflow-hidden bg-black">

      {/* Layer 0 — animated background (placeholder for now) */}
      <HalftoneBackground />

      {/* Layer 10 — centered importer */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
        <div className="relative w-full max-w-xl rounded-2xl bg-black/50 backdrop-blur-xl ring-1 ring-white/10 p-2">

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
      </div>

      {/* Layer 20 — corner brackets (pointer-events disabled so they never block clicks) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
        <div className="absolute top-7 left-7 h-3.5 w-3.5 border-t border-l border-white/80" />
        <div className="absolute top-7 right-7 h-3.5 w-3.5 border-t border-r border-white/80" />
        <div className="absolute bottom-7 left-7 h-3.5 w-3.5 border-b border-l border-white/80" />
        <div className="absolute bottom-7 right-7 h-3.5 w-3.5 border-b border-r border-white/80" />
      </div>

      {/* Layer 20 — bottom nav strip */}
      <div className="pointer-events-none absolute bottom-7 left-20 right-20 z-20 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-white/70">
        <span>PRICING · DOCS · ABOUT · CONTACT</span>
        <span>DUBLIN, IE</span>
      </div>

    </div>
  );
}
