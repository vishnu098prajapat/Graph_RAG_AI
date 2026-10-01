"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Github } from "lucide-react";

export function AppHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className="border-b border-slate-200/70 backdrop-blur-xl"
        style={{ background: "rgba(255,255,255,0.82)" }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">

          {/* Logo + wordmark */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 60%, #0ea5e9 100%)",
              }}
            >
              <BrainCircuit className="h-4 w-4 text-white" strokeWidth={1.8} />
            </div>

            <div className="leading-none">
              <span
                className="block text-[15px] font-bold tracking-tight"
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
              <span className="block text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                Graph-RAG Platform
              </span>
            </div>
          </div>

          {/* Centre nav */}
          <nav className="hidden items-center gap-7 md:flex">
            {["Features", "Architecture", "Benchmarks"].map((label) => (
              <span
                key={label}
                className="cursor-default text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-800"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {label}
              </span>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <span
              className="hidden rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-600 sm:inline-flex"
            >
              Phase 4 · Entity Graphs
            </span>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>

            <button
              className="rounded-lg px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow"
              style={{
                fontFamily: "var(--font-body)",
                background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
              }}
            >
              Try it free
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
