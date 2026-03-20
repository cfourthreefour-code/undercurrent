"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { getGraph } from "@/lib/api";
import type { GraphEdge, GraphNode } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// same community palette as the main graph page
const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#d946ef", "#a3e635",
  "#fb923c", "#2dd4bf", "#818cf8",
];

const TOP_N = 200;
const BG = "#0a0a0f";

// top ~15% of nodes by pagerank get a pulsing glow
const GLOW_THRESHOLD = 0.85;

export default function GraphPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dims, setDims] = useState({ width: 800, height: 800 });
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphEdge[] } | null>(null);
  const [ready, setReady] = useState(false);
  const maxPR = useRef(0.001);
  const startTime = useRef(Date.now());

  // measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setDims({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const obs = new ResizeObserver(() => measure());
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // fetch graph, keep top N by pagerank
  useEffect(() => {
    getGraph()
      .then((d) => {
        const sorted = [...d.nodes].sort((a, b) => b.pagerank - a.pagerank);
        const top = sorted.slice(0, TOP_N);
        const ids = new Set(top.map((n) => n.id));
        const links = d.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
        maxPR.current = Math.max(...top.map((n) => n.pagerank), 0.001);
        setGraphData({ nodes: top, links });
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  // keep the simulation gently alive — re-heat periodically for drift
  useEffect(() => {
    if (!fgRef.current) return;
    const interval = setInterval(() => {
      if (fgRef.current) {
        fgRef.current.d3ReheatSimulation?.();
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [ready]);

  // custom node renderer with pulsing glow for high-centrality nodes
  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D) => {
    const pr = node.pagerank || 0;
    const norm = pr / maxPR.current;
    const baseR = Math.max(1.5, norm * 8);
    const color = COLORS[(node.community_id ?? 0) % COLORS.length] || "#6b7280";
    const isGlow = norm > GLOW_THRESHOLD;

    if (isGlow) {
      // pulsing glow — slow breathing
      const t = (Date.now() - startTime.current) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.2 + (node.pagerank * 1000));
      const glowR = baseR + 6 + pulse * 5;

      ctx.beginPath();
      ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(")", `,${0.08 + pulse * 0.07})`).replace("rgb", "rgba").replace("#", "");
      // hex to rgba for glow
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.08 + pulse * 0.07})`;
      ctx.fill();

      // inner glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, baseR + 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.15 + pulse * 0.1})`;
      ctx.fill();
    }

    // core dot
    ctx.beginPath();
    ctx.arc(node.x, node.y, baseR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ background: BG }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/30" />
        </div>
      )}

      {graphData && dims.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeId="id"
          linkSource="source"
          linkTarget="target"
          width={dims.width}
          height={dims.height}
          backgroundColor={BG}
          nodeCanvasObject={drawNode}
          nodeVal={(n: any) => Math.max(1.5, (n.pagerank / maxPR.current) * 10)}
          nodeLabel={() => ""}
          linkWidth={0.4}
          linkColor={() => "rgba(255,255,255,0.12)"}
          enableNodeDrag={false}
          enableZoomInteraction={false}
          enablePanInteraction={false}
          enablePointerInteraction={false}
          cooldownTicks={400}
          d3AlphaDecay={0.005}
          d3VelocityDecay={0.3}
          d3AlphaMin={0.005}
        />
      )}
    </div>
  );
}
