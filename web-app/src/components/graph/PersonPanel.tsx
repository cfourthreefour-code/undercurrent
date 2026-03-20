"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronRight, X } from "lucide-react";
import { fetchPersonPanel } from "@/lib/api";
import type { PersonPanel as PanelData } from "@/lib/types";

function TierIcon({ tier }: { tier: string }) {
  if (tier === "critical") return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (tier === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <CheckCircle className="h-4 w-4 text-green-500" />;
}

function Accordion({
  title,
  open: defaultOpen = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        {title}
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {expanded && <div className="pb-3">{children}</div>}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string | number; cls?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={`font-medium font-mono ${cls || ""}`}>{value}</span>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-0.5">
      <div className="mb-0.5 flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-medium font-mono">{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-[var(--foreground)]"
          style={{ width: `${Math.min(value * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

const slideIn = {
  initial: { x: 380 },
  animate: { x: 0 },
  transition: { type: "spring", damping: 25, stiffness: 300 },
} as const;

export default function PersonPanel({
  personId,
  onClose,
  onSimulate,
}: {
  personId: string;
  onClose: () => void;
  onSimulate?: () => void;
}) {
  const [panel, setPanel] = useState<PanelData | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    setBusy(true);
    fetchPersonPanel(personId)
      .then((d) => { setPanel(d); setBusy(false); })
      .catch(() => setBusy(false));
  }, [personId]);

  if (busy) {
    return (
      <motion.div
        className="flex w-[380px] items-center justify-center border-l border-[var(--card-border)] bg-white"
        {...slideIn}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[var(--foreground)]" />
      </motion.div>
    );
  }

  if (!panel) {
    return (
      <motion.div
        className="w-[380px] border-l border-[var(--card-border)] bg-white p-5"
        initial={{ x: 380 }}
        animate={{ x: 0 }}
      >
        <p className="text-sm text-[var(--muted)]">Failed to load data.</p>
        <button onClick={onClose} className="mt-2 text-sm underline">Close</button>
      </motion.div>
    );
  }

  const volSign = panel.volume_delta_pct > 0 ? "+" : "";
  const divSign = panel.diversity_delta_pct > 0 ? "+" : "";

  return (
    <motion.div
      className="flex h-full w-[380px] flex-col border-l border-[var(--card-border)] bg-white"
      {...slideIn}
    >
      {/* header */}
      <div className="border-b border-[var(--card-border)] p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TierIcon tier={panel.alert_tier} />
            <div>
              <h3 className="text-base font-semibold leading-tight">{panel.name}</h3>
              <p className="text-xs text-[var(--muted)]">{panel.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--muted)] hover:bg-gray-100 hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {panel.since && (
          <p className="mt-2 text-xs text-[var(--muted)]">Since: {panel.since}</p>
        )}
        {onSimulate && (
          <button
            onClick={onSimulate}
            className="mt-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-gray-100"
          >
            🔮 What if they leave?
          </button>
        )}
      </div>

      {/* scrollable body */}
      <div className="flex-1 overflow-y-auto px-4">
        <Accordion title="Role Snapshot" open>
          <p className="text-sm leading-relaxed text-gray-700">{panel.role_snapshot}</p>
        </Accordion>

        <Accordion title="Current Workstreams" open>
          <div className="space-y-2">
            {panel.workstreams.map((ws) => (
              <div key={ws.label}>
                <div className="mb-0.5 flex justify-between text-xs">
                  <span>{ws.label}</span>
                  <span className="font-mono">{ws.percent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-[var(--foreground)]"
                    style={{ width: `${ws.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Accordion>

        <Accordion title="Communication Health">
          <Stat label="Emails / day" value={panel.emails_per_day} />
          <Stat label="Inbound" value={`${panel.in_pct}%`} />
          <Stat label="Outbound" value={`${panel.out_pct}%`} />
          <Stat label="Median response" value={`${panel.median_response_time_hrs}h`} />
          <Stat label="After-hours" value={panel.after_hours_activity} />
        </Accordion>

        <Accordion title="Influence & Flow">
          <Bar label="In-degree" value={panel.in_degree_norm} />
          <Bar label="Out-degree" value={panel.out_degree_norm} />
          <Stat label="Response latency" value={panel.response_latency} />
        </Accordion>

        <Accordion title="Recent Changes (14d)">
          <Stat
            label="Volume"
            value={`${volSign}${panel.volume_delta_pct}%`}
            cls={panel.volume_delta_pct > 10 ? "text-green-600" : panel.volume_delta_pct < -10 ? "text-red-600" : ""}
          />
          {panel.new_topic && <Stat label="New topic" value={panel.new_topic} />}
          <Stat label="Diversity" value={`${divSign}${panel.diversity_delta_pct}%`} />
        </Accordion>

        <Accordion title="Comparisons">
          <Stat label="Peer rank" value={`#${panel.peer_rank} of ${panel.peer_total}`} />

          {panel.likely_backups.length > 0 && (
            <div className="mt-1">
              <p className="mb-1 text-xs text-[var(--muted)]">Likely backups:</p>
              <div className="space-y-0.5">
                {panel.likely_backups.map((name) => (
                  <p key={name} className="text-sm">{name}</p>
                ))}
              </div>
            </div>
          )}

          {panel.comparable_peers?.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-[var(--muted)]">Comparable peers:</p>
              <div className="space-y-2">
                {panel.comparable_peers.map((peer) => (
                  <div key={peer.name} className="rounded-lg bg-gray-50 p-2">
                    <p className="mb-1 text-sm font-medium">{peer.name}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                      <span className="text-[var(--muted)]">Betweenness</span>
                      <span className="text-right font-mono">{peer.betweenness.toFixed(5)}</span>
                      <span className="text-[var(--muted)]">PageRank</span>
                      <span className="text-right font-mono">{peer.pagerank.toFixed(5)}</span>
                      <span className="text-[var(--muted)]">Sent</span>
                      <span className="text-right font-mono">{peer.total_sent}</span>
                      <span className="text-[var(--muted)]">Received</span>
                      <span className="text-right font-mono">{peer.total_received}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Accordion>
      </div>
    </motion.div>
  );
}
