"use client";

import { motion } from "framer-motion";
import { Network } from "lucide-react";
import type { DocInfo } from "@/lib/api";

// Decorative preview only. The real graph (entities + relations) arrives in Phase 4.
const NODES = [
  { x: 50, y: 48, r: 7 },
  { x: 24, y: 28, r: 5 },
  { x: 76, y: 26, r: 5 },
  { x: 18, y: 64, r: 4 },
  { x: 80, y: 66, r: 6 },
  { x: 46, y: 82, r: 4 },
  { x: 62, y: 12, r: 3 },
];
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [2, 6], [1, 3], [4, 5],
];

export function GraphPlaceholder({ doc }: { doc: DocInfo }) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3 text-xs text-zinc-400">
        <Network className="h-3.5 w-3.5" />
        Knowledge graph
        <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-500">Phase 4</span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
          {EDGES.map(([a, b], i) => (
            <motion.line
              key={i}
              x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
              stroke="rgba(124,131,255,0.35)" strokeWidth={0.3}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.7 }}
            />
          ))}
          {NODES.map((n, i) => (
            <motion.circle
              key={i}
              cx={n.x} cy={n.y} r={n.r}
              fill="rgba(124,131,255,0.18)" stroke="rgba(165,169,255,0.7)" strokeWidth={0.4}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
              transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 180, damping: 14 }}
            />
          ))}
        </svg>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-canvas via-canvas/90 to-transparent p-4 pt-10">
          <p className="text-sm font-medium text-zinc-200">Entity graph coming next</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Entities and relationships from all {doc.n_pages} pages will appear here as draggable nodes. Selecting a
            node will highlight its source sentences in the document.
          </p>
        </div>
      </div>
    </div>
  );
}
