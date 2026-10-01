"use client";

import { BrainCircuit } from "lucide-react";

const STACK = [
  "Graph-RAG",
  "BM25 + Dense",
  "RRF Fusion",
  "LexicalReranker",
  "Exact Citations",
  "100% Local",
];

const LINKS = [
  { label: "GitHub",       href: "#" },
  { label: "Architecture", href: "#" },
  { label: "Benchmarks",   href: "#" },
  { label: "About",        href: "#" },
];

export function AppFooter() {
  return (
    <footer className="relative border-t border-slate-200 bg-white">
      {/* Top pink-sky glow line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, #ec4899, #8b5cf6, #0ea5e9, transparent)",
        }}
      />

      <div className="mx-auto max-w-6xl px-5 py-12">
        {/* Stack pills */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
          {STACK.map((s) => (
            <span
              key={s}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-500"
            >
              {s}
            </span>
          ))}
        </div>

        {/* Logo row */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 60%, #0ea5e9 100%)" }}
            >
              <BrainCircuit className="h-4 w-4 text-white" strokeWidth={1.8} />
            </div>
            <span
              className="text-sm font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(135deg, #db2777, #7c3aed)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              CogniGraph AI
            </span>
          </div>

          <p className="max-w-md text-center text-xs leading-relaxed text-slate-400">
            Autonomous self-correcting Graph-RAG platform with hybrid BM25 + vector
            retrieval, RRF fusion, and exact page-level citation highlighting — all
            running locally in your browser.
          </p>
        </div>

        {/* Nav links */}
        <div className="mb-8 flex items-center justify-center gap-6">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[12px] text-slate-400 transition-colors hover:text-slate-600"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} CogniGraph AI — Built as an advanced AI/ML portfolio project.
          <span className="mx-2">·</span>
          No data ever leaves your device.
        </p>
      </div>
    </footer>
  );
}
