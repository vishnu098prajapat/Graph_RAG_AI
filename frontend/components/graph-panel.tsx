"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Search, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import {
  fetchGraph,
  type DocInfo,
  type EntityType,
  type KnowledgeGraphData,
  type SearchResult,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface SimNode {
  id: string; text: string; type: EntityType; freq: number; pages: number[];
  x: number; y: number; vx: number; vy: number; fx?: number; fy?: number;
}

interface Props {
  doc: DocInfo;
  onPageClick: (page: number) => void;
}

// ── Light-theme entity palette ────────────────────────────────────────────────
const TYPE_META: Record<EntityType, { bg: string; border: string; dot: string; text: string; label: string }> = {
  TECH:    { bg: "rgba(79,70,229,0.1)",  border: "#0ea5e9", dot: "#4f46e5", text: "#4338ca", label: "Tech"    },
  CONCEPT: { bg: "rgba(124,58,237,0.1)", border: "#8b5cf6", dot: "#7c3aed", text: "#6d28d9", label: "Concept" },
  TERM:    { bg: "rgba(13,148,136,0.1)", border: "#14b8a6", dot: "#0d9488", text: "#0f766e", label: "Term"    },
  ORG:     { bg: "rgba(217,119,6,0.1)",  border: "#f59e0b", dot: "#d97706", text: "#b45309", label: "Org"     },
  PERSON:  { bg: "rgba(5,150,105,0.1)",  border: "#34d399", dot: "#059669", text: "#047857", label: "Person"  },
};
const ALL_TYPES: EntityType[] = ["TECH", "CONCEPT", "TERM", "ORG", "PERSON"];

// ── Physics ────────────────────────────────────────────────────────────────────
const K_REPEL = 3600, K_SPRING = 0.022, K_CENTER = 0.004,
      REST_LEN = 90, DAMPING = 0.86, SIM_TICKS = 220;

function nodeRadius(freq: number, maxFreq: number) {
  return 6 + (maxFreq > 1 ? freq / maxFreq : 0.5) * 14;
}

export function GraphPanel({ doc, onPageClick }: Props) {
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [query,     setQuery]     = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<EntityType>>(new Set(ALL_TYPES));
  const [hoveredId,  setHoveredId]  = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom,   setZoom]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panRef = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const simNodes = useRef<SimNode[]>([]);
  const rafId    = useRef(0);
  const tickRef  = useRef(0);
  const [renderedNodes, setRenderedNodes] = useState<{ id: string; x: number; y: number }[]>([]);

  useEffect(() => {
    setGraphData(null); setError(null); setLoading(true);
    setQuery(""); setSelectedId(null); setHoveredId(null);
    setZoom(1); setOffset({ x: 0, y: 0 });
    let cancelled = false;
    fetchGraph(doc.id)
      .then((d) => { if (!cancelled) setGraphData(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doc.id]);

  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) return;
    
    // Initial center based on current container size or fallback
    const initialW = svgRef.current?.clientWidth || 1000;
    const initialH = svgRef.current?.clientHeight || 600;
    const cx = initialW / 2;
    const cy = initialH / 2;
    const maxFreq = Math.max(...graphData.nodes.map((n) => n.freq), 1);
    simNodes.current = graphData.nodes.map((n, i) => {
      const angle = (i / graphData.nodes.length) * Math.PI * 2;
      const r = Math.min(cx, cy) * 0.55;
      return { ...n, x: cx + r * Math.cos(angle) + (Math.random()-0.5)*20,
               y: cy + r * Math.sin(angle) + (Math.random()-0.5)*20, vx: 0, vy: 0 };
    });
    const adj = new Map<string, { otherId: string; weight: number }[]>();
    for (const e of graphData.edges) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      if (!adj.has(e.target)) adj.set(e.target, []);
      adj.get(e.source)!.push({ otherId: e.target, weight: e.weight });
      adj.get(e.target)!.push({ otherId: e.source, weight: e.weight });
    }
    const idxById = new Map(simNodes.current.map((n, i) => [n.id, i]));
    tickRef.current = 0; cancelAnimationFrame(rafId.current);
    const tick = () => {
      const nodes = simNodes.current; const N = nodes.length; tickRef.current++;
      // Dynamically get bounds so resizing the window allows nodes to expand
      const w = svgRef.current?.clientWidth || 1000;
      const h = svgRef.current?.clientHeight || 600;
      const currentCx = w / 2;
      const currentCy = h / 2;

      for (let i = 0; i < N; i++) {
        const a = nodes[i];
        if (a.fx !== undefined) { a.x = a.fx; a.y = a.fy!; continue; }
        let fx = 0, fy = 0;
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const b = nodes[j]; const dx = a.x - b.x; const dy = a.y - b.y;
          const d2 = dx*dx + dy*dy + 1; const f = K_REPEL / d2; const d = Math.sqrt(d2);
          fx += (dx/d)*f; fy += (dy/d)*f;
        }
        for (const { otherId, weight } of adj.get(a.id) ?? []) {
          const bi = idxById.get(otherId); if (bi === undefined) continue;
          const b = nodes[bi]; const dx = b.x - a.x; const dy = b.y - a.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 1;
          const stretch = (d - REST_LEN * (1 + (1-weight)*0.5)) * K_SPRING * weight;
          fx += (dx/d)*stretch; fy += (dy/d)*stretch;
        }
        fx += (currentCx - a.x) * K_CENTER; fy += (currentCy - a.y) * K_CENTER;
        a.vx = (a.vx + fx) * DAMPING; a.vy = (a.vy + fy) * DAMPING;
        a.x += a.vx; a.y += a.vy;
        const rr = nodeRadius(a.freq, maxFreq) + 4;
        a.x = Math.max(rr, Math.min(w-rr, a.x)); a.y = Math.max(rr, Math.min(h-rr, a.y));
      }
      setRenderedNodes(nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })));
      if (tickRef.current < SIM_TICKS) rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [graphData]);

  const maxFreq = useMemo(() => Math.max(...(graphData?.nodes.map((n) => n.freq) ?? [1]), 1), [graphData]);
  const posById = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    renderedNodes.forEach((n) => m.set(n.id, { x: n.x, y: n.y }));
    return m;
  }, [renderedNodes]);

  const visibleIds = useMemo(() => {
    if (!graphData) return new Set<string>();
    const q = query.toLowerCase().trim();
    return new Set(graphData.nodes.filter(
      (n) => typeFilter.has(n.type) && (q === "" || n.text.toLowerCase().includes(q))
    ).map((n) => n.id));
  }, [graphData, query, typeFilter]);

  const connectedToSelected = useMemo(() => {
    if (!selectedId || !graphData) return new Set<string>();
    const s = new Set<string>();
    for (const e of graphData.edges) {
      if (e.source === selectedId) s.add(e.target);
      if (e.target === selectedId) s.add(e.source);
    }
    return s;
  }, [selectedId, graphData]);

  const startDrag = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const node = simNodes.current.find((n) => n.id === id);
    if (!node) return;
    node.fx = node.x; node.fy = node.y;
    if (tickRef.current >= SIM_TICKS) {
      tickRef.current = 0;
      const tick = () => {
        setRenderedNodes(simNodes.current.map((n) => ({ id: n.id, x: n.x, y: n.y })));
        if (tickRef.current < SIM_TICKS) rafId.current = requestAnimationFrame(tick);
      };
      rafId.current = requestAnimationFrame(tick);
    }
  }, []);

  const moveDrag = useCallback((id: string, e: React.PointerEvent) => {
    const node = simNodes.current.find((n) => n.id === id);
    if (!node || node.fx === undefined) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    node.fx = (e.clientX - rect.left - offset.x) / zoom;
    node.fy = (e.clientY - rect.top  - offset.y) / zoom;
    node.x = node.fx; node.y = node.fy;
  }, [offset, zoom]);

  const endDrag = useCallback((id: string) => {
    const node = simNodes.current.find((n) => n.id === id);
    if (node) { node.fx = undefined; node.fy = undefined; }
    tickRef.current = 0;
  }, []);

  const onBgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).dataset.draggable) return;
    panRef.current = { active: true, startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onBgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!panRef.current.active) return;
    setOffset({ x: panRef.current.ox + (e.clientX-panRef.current.startX), y: panRef.current.oy + (e.clientY-panRef.current.startY) });
  };
  const onBgPointerUp = () => { panRef.current.active = false; };

  const tooltipNode = useMemo(
    () => graphData?.nodes.find((n) => n.id === (hoveredId ?? selectedId)),
    [graphData, hoveredId, selectedId],
  );
  const isEmpty = !graphData || graphData.nodes.length === 0;

  // Count entities per type
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<EntityType, number>> = {};
    graphData?.nodes.forEach((n) => { counts[n.type] = (counts[n.type] ?? 0) + 1; });
    return counts;
  }, [graphData]);

  return (
    <div className="relative flex h-full flex-col select-none bg-white" style={{ backgroundImage: "radial-gradient(rgba(14, 165, 233, 0.15) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>

      {/* ── Header ── */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 text-xs">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ background: "linear-gradient(135deg, #38bdf8, #0284c7)" }}
        >
          <Network className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-semibold text-slate-700" style={{ fontFamily: "var(--font-display)" }}>
          Knowledge Graph
        </span>
        {graphData && !isEmpty && (
          <span className="text-slate-400">
            · {graphData.nodes.length} entities · {graphData.edges.length} links
          </span>
        )}
        {loading && <span className="ml-1 animate-pulse text-slate-400">building…</span>}
        {!isEmpty && (
          <span className="ml-auto rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600">
            Phase 4
          </span>
        )}
      </div>

      {/* ── Entity type chips (compact horizontal) ── */}
      {graphData && !isEmpty && (
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-3 py-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ALL_TYPES.map((t) => {
              const meta  = TYPE_META[t];
              const count = typeCounts[t] ?? 0;
              if (count === 0) return null;
              const active = typeFilter.has(t);
              return (
                <button
                  key={t}
                  onClick={() =>
                    setTypeFilter((prev) => {
                      const next = new Set(prev);
                      next.has(t) ? next.delete(t) : next.add(t);
                      return next;
                    })
                  }
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all"
                  style={{
                    background: active ? meta.bg : "rgba(0,0,0,0.03)",
                    border: `1px solid ${active ? meta.border + "80" : "rgba(0,0,0,0.08)"}`,
                    color: active ? meta.text : "#94a3b8",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: active ? meta.dot : "#94a3b8" }} />
                  {meta.label} {count}
                </button>
              );
            })}
            {/* Inline search */}
            <div className="relative ml-auto shrink-0">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter…"
                className="w-24 rounded-full border border-slate-200 bg-white py-0.5 pr-2 text-[10px] text-slate-600 placeholder-slate-400 outline-none focus:border-sky-300"
                style={{ paddingLeft: "20px" }}
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Graph SVG ── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(14,165,233,0.12) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />

        {(loading || error || isEmpty) ? (
          <div className="flex h-full items-center justify-center">
            {loading && <PlaceholderGraph />}
            {error   && <p className="text-xs text-red-500">{error}</p>}
            {!loading && !error && isEmpty && (
              <div className="flex flex-col items-center gap-3 text-center">
                <PlaceholderGraph />
                <p className="text-xs text-slate-400">Upload a document to build its knowledge graph</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <svg
              ref={svgRef}
              className="h-full w-full cursor-grab active:cursor-grabbing"
              onPointerDown={onBgPointerDown}
              onPointerMove={onBgPointerMove}
              onPointerUp={onBgPointerUp}
              onPointerLeave={onBgPointerUp}

            >
              <g transform={`translate(${offset.x},${offset.y}) scale(${zoom})`}>
                {/* Edges */}
                {graphData!.edges.map((e) => {
                  const pa = posById.get(e.source); const pb = posById.get(e.target);
                  if (!pa || !pb || !visibleIds.has(e.source) || !visibleIds.has(e.target)) return null;
                  const hiSrc = e.source === selectedId || e.target === selectedId;
                  const opacity = selectedId ? (hiSrc ? 0.7 : 0.05) : e.weight * 0.5;
                  return (
                    <line key={`${e.source}-${e.target}`}
                      x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                      stroke={hiSrc ? "#0ea5e9" : "rgba(14,165,233,0.35)"} strokeDasharray={hiSrc ? "4 2" : "none"}
                      strokeWidth={hiSrc ? 1.5*e.weight+0.5 : e.weight+0.3}
                      strokeOpacity={opacity}
                    />
                  );
                })}

                {/* Nodes */}
                {graphData!.nodes.map((node) => {
                  const pos = posById.get(node.id);
                  if (!pos) return null;
                  const meta    = TYPE_META[node.type] ?? TYPE_META.TERM;
                  const r       = nodeRadius(node.freq, maxFreq);
                  const isSel   = node.id === selectedId;
                  const isHov   = node.id === hoveredId;
                  const isConn  = connectedToSelected.has(node.id);
                  const visible = visibleIds.has(node.id);
                  const opacity = selectedId ? (isSel || isConn ? 1 : 0.18) : visible ? 1 : 0.12;

                  return (
                    <g
                      key={node.id}
                      data-draggable="true"
                      style={{ cursor: "pointer", opacity, transition: "opacity 0.2s" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedId === node.id) setSelectedId(null);
                        else { setSelectedId(node.id); if (node.pages[0] !== undefined) onPageClick(node.pages[0]); }
                      }}
                      onPointerDown={(e) => startDrag(node.id, e)}
                      onPointerMove={(e) => moveDrag(node.id, e)}
                      onPointerUp={() => endDrag(node.id)}
                      onMouseEnter={() => setHoveredId(node.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {isSel && (
                        <>
                          {/* Animated pulsing outer ring for selected node */}
                          <motion.circle 
                            cx={pos.x} cy={pos.y} r={r+10} fill="none"
                            stroke={meta.dot} strokeWidth="1.5" strokeDasharray="4 4" opacity={0.5}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, ease: "linear", repeat: Infinity }}
                            style={{ originX: `${pos.x}px`, originY: `${pos.y}px` }}
                          />
                          <motion.circle 
                            cx={pos.x} cy={pos.y} r={r+14} fill="none"
                            stroke={meta.dot} strokeWidth="1" opacity={0.2}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0, 0.2] }}
                            transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                          />
                        </>
                      )}
                      {isHov && !isSel && (
                        <circle cx={pos.x} cy={pos.y} r={r+5} fill={meta.dot} opacity={0.12} />
                      )}
                      {/* Shadow circle */}
                      <circle cx={pos.x+1} cy={pos.y+1} r={r} fill="rgba(0,0,0,0.08)" />
                      {/* Main circle */}
                      <circle
                        cx={pos.x} cy={pos.y} r={r}
                        fill={isSel ? meta.dot : meta.bg.replace("0.1)", "0.85)")}
                        stroke={meta.border}
                        strokeWidth={isSel ? 2 : 1}
                      />
                      {/* White center dot */}
                      {r > 8 && (
                        <circle cx={pos.x} cy={pos.y} r={2.5} fill="rgba(255,255,255,0.7)" style={{ pointerEvents: "none" }} />
                      )}
                      {/* Label */}
                      {(r > 9 || isSel || isHov) && (
                        <text x={pos.x} y={pos.y + r + 10}
                          textAnchor="middle"
                          fill={isSel || isHov ? meta.text : "rgba(71,85,105,0.75)"}
                          fontSize={isSel ? "8.5" : "7.5"}
                          fontWeight={isSel ? "700" : "500"}
                          fontFamily="system-ui,sans-serif"
                          style={{ pointerEvents: "none", userSelect: "none" }}
                        >
                          {node.text.length > 15 ? node.text.slice(0, 14)+"…" : node.text}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Zoom controls */}
            <div className="absolute bottom-12 right-2 flex flex-col gap-1">
              {[
                { icon: ZoomIn,   action: () => setZoom((z) => Math.min(3, z+0.2))  },
                { icon: ZoomOut,  action: () => setZoom((z) => Math.max(0.3, z-0.2))},
                { icon: Maximize2,action: () => { setZoom(1); setOffset({x:0,y:0}); }},
              ].map(({ icon: Icon, action }, i) => (
                <button key={i} onClick={action}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm hover:border-slate-300 hover:text-slate-600">
                  <Icon className="h-3 w-3" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Tooltip ── */}
      <AnimatePresence>
        {tooltipNode && (
          <motion.div
            key={tooltipNode.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="shrink-0 border-t border-slate-100 bg-white px-3 py-2.5"
          >
            <div className="flex items-start gap-2">
              <span
                className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: TYPE_META[tooltipNode.type]?.bg, color: TYPE_META[tooltipNode.type]?.text, border: `1px solid ${TYPE_META[tooltipNode.type]?.border}` }}
              >
                {tooltipNode.type}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-slate-700" style={{ fontFamily: "var(--font-display)" }}>
                  {tooltipNode.text}
                </p>
                <p className="text-[11px] text-slate-400">
                  {tooltipNode.freq} mention{tooltipNode.freq !== 1 ? "s" : ""} ·{" "}
                  p.{tooltipNode.pages.slice(0, 4).join(", ")}{tooltipNode.pages.length > 4 ? "…" : ""}
                </p>
              </div>
              {tooltipNode.pages[0] !== undefined && (
                <button
                  onClick={() => onPageClick(tooltipNode.pages[0])}
                  className="ml-auto shrink-0 rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-600 hover:bg-sky-100"
                >
                  Jump →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!tooltipNode && (
        <div className="shrink-0 border-t border-slate-100 px-3 py-2">
          <p className="text-center text-[10px] text-slate-400">
            {graphData && !isEmpty
              ? "Click node → jump to page · drag to rearrange · scroll to zoom"
              : "Entity graph builds on document upload"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Placeholder skeleton ──────────────────────────────────────────────────────
const PH_NODES = [
  {x:50,y:50,r:8},{x:20,y:28,r:5},{x:80,y:24,r:6},
  {x:14,y:68,r:4},{x:82,y:68,r:7},{x:44,y:84,r:4},{x:64,y:12,r:3},
];
const PH_EDGES: [number,number][] = [[0,1],[0,2],[0,3],[0,4],[0,5],[2,6],[1,3],[4,5],[2,4]];

function PlaceholderGraph() {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 100 100" width="160" height="160">
        {PH_EDGES.map(([a,b],i) => (
          <motion.line key={i}
            x1={PH_NODES[a].x} y1={PH_NODES[a].y}
            x2={PH_NODES[b].x} y2={PH_NODES[b].y}
            stroke="rgba(14,165,233,0.2)" strokeWidth={0.5}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.3+i*0.08, duration: 0.6 }}
          />
        ))}
        {PH_NODES.map((n,i) => (
          <motion.circle key={i} cx={n.x} cy={n.y} r={n.r}
            fill="rgba(14,165,233,0.12)" stroke="rgba(14,165,233,0.3)" strokeWidth={0.6}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            transition={{ delay: 0.15+i*0.07, type: "spring", stiffness: 190, damping: 14 }}
          />
        ))}
      </svg>
    </div>
  );
}
