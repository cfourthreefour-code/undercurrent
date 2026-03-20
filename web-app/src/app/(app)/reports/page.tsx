"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getHealthReport } from "@/lib/api";
import type { ReportSection } from "@/lib/types";

export default function ReportsPage() {
  const [report, setReport] = useState<ReportSection[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const data = await getHealthReport();
      setReport(data.report);
      setDone(true);
    } catch (err) {
      console.error("report failed:", err);
    }
    setBusy(false);
  };

  if (!done) {
    return (
      <div className="mx-auto max-w-3xl p-6 pt-16 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-[var(--muted)]" />
        <h2 className="mb-2 text-xl font-semibold">Organizational Health Report</h2>
        <p className="mx-auto mb-8 max-w-md text-sm text-[var(--muted)]">
          Generate a comprehensive diagnostic report with executive summary,
          critical personnel analysis, bottleneck identification, and actionable recommendations.
        </p>

        <button
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-6 py-3 font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating report...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Generate Report
            </>
          )}
        </button>

        {busy && (
          <p className="mt-4 text-xs text-[var(--muted)]">
            This may take 15–30 seconds as the AI analyzes organizational data...
          </p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-4xl p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Organizational Health Report</h2>
        <button
          onClick={() => window.print()}
          className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-white">
        {report.map((section, i) => (
          <motion.div
            key={i}
            className="border-b border-gray-50 p-6 last:border-b-0"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <h3 className="mb-3 text-lg font-semibold">{section.title}</h3>
            <div className="prose prose-sm max-w-none text-sm leading-relaxed text-gray-700 prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-table:my-3 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-1.5 prose-th:text-left prose-th:font-medium prose-td:border-t prose-td:border-gray-100 prose-td:px-3 prose-td:py-1.5 prose-strong:text-gray-900 prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs">
              <Markdown remarkPlugins={[remarkGfm]}>{section.content}</Markdown>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
