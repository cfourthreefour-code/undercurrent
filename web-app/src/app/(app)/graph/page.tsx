"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { getGraph } from "@/lib/api";
import type { GraphEdge, GraphNode } from "@/lib/types";
import PersonPanel from "@/components/graph/PersonPanel";
import WhatIfPanel from "@/components/graph/WhatIfPanel";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// 18-color community palette
const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#d946ef", "#a3e635",
  "#fb923c", "#2dd4bf", "#818cf8",
];

interface FNode extends GraphNode {
  x?: number;
  y?: number;
  fx?: number | undefined;
  fy?: number | undefined;
  [key: string]: any;
}

function Spinner() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--foreground)]" />
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <GraphCanvas />
    </Suspense>
  );
}

function GraphCanvas() {
  const params = useSearchParams();
  const focus = params.get("focus");

  const [nodes, setNodes] = useState<FNode[]>([]);
  const [links, setLinks] = useState<GraphEdge[]>([]);
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [simTarget, setSimTarget] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dims, setDims] = useState({ width: 800, height: 600 });

  const fg = useRef<any>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getGraph()
      .then((d) => { setNodes(d.nodes); setLinks(d.edges); setBusy(false); })
      .catch((err) => { console.error("graph load failed:", err); setBusy(false); });
  }, []);

  // zoom to focused node from URL param
  useEffect(() => {
    if (!focus || !nodes.length || selected) return;
    const n = nodes.find((x) => x.id === focus);
    if (!n) return;
    setSelected(n.id);
    setTimeout(() => {
      if (fg.current && n.x !== undefined) {
        fg.current.centerAt(n.x, n.y, 500);
        fg.current.zoom(1.5, 500);
      }
    }, 300);
  }, [focus, nodes, selected]);

  // resize canvas when panel opens/closes
  useEffect(() => {
    const resize = () =>
      setDims({
        width: window.innerWidth - (selected ? 380 : 0),
        height: window.innerHeight - 56,
      });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [selected]);

  // debounced search zoom
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query) return;
    debounce.current = setTimeout(() => {
      const n = nodes.find((x) => x.name.toLowerCase().includes(query.toLowerCase()));
      if (n && fg.current && n.x !== undefined) {
        fg.current.centerAt(n.x, n.y, 500);
        fg.current.zoom(1.5, 500);
      }
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, nodes]);

  const highlighted = query
    ? nodes.find((n) => n.name.toLowerCase().includes(query.toLowerCase()))?.id
    : null;

  const maxPR = Math.max(...nodes.map((n) => n.pagerank), 0.001);

  const onNodeClick = useCallback((node: any) => {
    setSelected(node.id);
    if (fg.current) {
      fg.current.centerAt(node.x, node.y, 500);
      fg.current.zoom(1.5, 500);
    }
  }, []);

  const onBgClick = useCallback(() => setSelected(null), []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && highlighted) setSelected(highlighted);
  }, [highlighted]);

  if (busy) return <Spinner />;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="relative flex-1 bg-gray-50 transition-all duration-300">
        <ForceGraph2D
          ref={fg}
          graphData={{ nodes, links }}
          nodeId="id"
          linkSource="source"
          linkTarget="target"
          nodeLabel={(n: any) => n.name}
          nodeVal={(n: any) => Math.max(2, (n.pagerank / maxPR) * 20)}
          nodeColor={(n: any) => {
            if (highlighted === n.id || selected === n.id) return "#000000";
            return COLORS[(n.community_id ?? 0) % COLORS.length] || "#6b7280";
          }}
          linkWidth={(l: any) => Math.max(0.3, l.weight * 3)}
          linkColor={(l: any) => {
            if (l.sentiment < -0.1) return "rgba(239,68,68,0.4)";
            if (l.sentiment > 0.2) return "rgba(34,197,94,0.3)";
            return "rgba(156,163,175,0.2)";
          }}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={onNodeClick}
          onBackgroundClick={onBgClick}
          backgroundColor="#f9fafb"
          width={dims.width}
          height={dims.height}
        />

        {/* search box */}
        <div className="absolute left-4 top-4">
          <div className="w-64 rounded-lg border border-[var(--card-border)] bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search people..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {selected && !simTarget && (
        <PersonPanel
          personId={selected}
          onClose={() => setSelected(null)}
          onSimulate={() => setSimTarget(selected)}
        />
      )}
      {simTarget && (
        <WhatIfPanel
          nodeId={simTarget}
          onClose={() => { setSimTarget(null); setSelected(null); }}
          onBack={() => setSimTarget(null)}
        />
      )}
    </div>
  );
}
