"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import type { DocInfo, SearchResult } from "@/lib/api";
import { GraphPanel } from "@/components/graph-panel";
import { SearchPanel } from "@/components/search-panel";

// ── Doc tab colors (cycles through for each doc) ──────────────────────────────

const DOC_COLORS = [
  { dot: "#ec4899", bg: "rgba(236,72,153,0.1)",  text: "#be185d" },
  { dot: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  text: "#6d28d9" },
  { dot: "#0ea5e9", bg: "rgba(14,165,233,0.1)",  text: "#0369a1" },
  { dot: "#10b981", bg: "rgba(16,185,129,0.1)",  text: "#047857" },
  { dot: "#f59e0b", bg: "rgba(245,158,11,0.1)",  text: "#b45309" },
  { dot: "#ef4444", bg: "rgba(239,68,68,0.1)",   text: "#b91c1c" },
];

export function docColor(idx: number) {
  return DOC_COLORS[idx % DOC_COLORS.length];
}

// ── PDF viewer ────────────────────────────────────────────────────────────────

function PdfViewer({
  docId,
  jumpPage,
  highlights,
}: {
  docId: string;
  jumpPage: number;
  highlights: SearchResult | null;
}) {
  const { pdfUrl } = require("@/lib/api") as typeof import("@/lib/api");
  const src = `${pdfUrl(docId)}#page=${jumpPage}`;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Page badge */}
      {jumpPage > 1 && (
        <div className="absolute top-2 right-2 z-10 rounded-full bg-white/90 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm backdrop-blur">
          p. {jumpPage}
        </div>
      )}
      <iframe
        key={src}
        src={src}
        className="flex-1 w-full h-full border-0"
        title="PDF viewer"
      />
    </div>
  );
}

// ── Main workbench ────────────────────────────────────────────────────────────

interface WorkbenchProps {
  docs: DocInfo[];
  onReset: () => void;
}

export function Workbench({ docs, onReset }: WorkbenchProps) {
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [jumpPage,     setJumpPage]     = useState(1);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [crossDoc,     setCrossDoc]     = useState(docs.length > 1);

  const activeDoc = docs[activeIdx] ?? docs[0];

  // When a search result is clicked: switch to its doc + jump to citation page
  const handleResultJump = useCallback((result: SearchResult) => {
    setSelectedResult(result);
    const targetIdx = docs.findIndex((d) => d.id === result.doc_id);
    if (targetIdx !== -1 && targetIdx !== activeIdx) {
      setActiveIdx(targetIdx);
    }
    // Jump to the page with the most text from this chunk, not always the first citation.
    const primaryCitation = result.citations?.length
      ? result.citations.reduce((best, c) => (c.end - c.start) > (best.end - best.start) ? c : best)
      : null;
    if (primaryCitation) {
      setJumpPage(primaryCitation.page);
    }
  }, [docs, activeIdx]);

  const totalPages  = useMemo(() => docs.reduce((s, d) => s + d.n_pages,  0), [docs]);
  const totalChunks = useMemo(() => docs.reduce((s, d) => s + d.n_chunks, 0), [docs]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f5f7ff]">

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center gap-3 border-b border-slate-200 px-4 py-2.5"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>

        {/* Back */}
        <button onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Branding */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#ec4899,#8b5cf6)" }}>
            <span className="text-white text-[10px] font-black">C</span>
          </div>
          <span className="text-sm font-bold text-slate-700 hidden sm:block">CogniGraph</span>
        </div>

        <div className="w-px h-4 bg-slate-200 shrink-0" />

        {/* Doc tabs — scrollable when many */}
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 scrollbar-none">
          {docs.length === 1 ? (
            /* Single doc: show filename + stats inline */
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
                style={{ background: "linear-gradient(135deg,#ec4899,#8b5cf6)" }}>
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                {activeDoc.filename}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Pill>{activeDoc.n_pages.toLocaleString()} pages</Pill>
                <Pill>{activeDoc.n_chunks.toLocaleString()} chunks</Pill>
              </div>
            </div>
          ) : (
            /* Multiple docs: clickable tabs */
            <>
              {docs.map((doc, i) => {
                const color  = docColor(i);
                const active = i === activeIdx;
                return (
                  <button key={doc.id} onClick={() => { setActiveIdx(i); setJumpPage(1); setSelectedResult(null); }}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0 whitespace-nowrap"
                    style={{
                      background:  active ? color.bg   : "transparent",
                      color:       active ? color.text : "#64748b",
                      border:      `1px solid ${active ? color.dot + "40" : "transparent"}`,
                    }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color.dot }} />
                    <span className="max-w-[120px] truncate">{doc.filename.replace(/\.pdf$/i, "")}</span>
                    <span className="text-[10px] opacity-60">{doc.n_pages}p</span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Multi-doc aggregate stats */}
        {docs.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <Pill>{docs.length} docs</Pill>
            <Pill>{totalPages.toLocaleString()} pages</Pill>
            <Pill>{totalChunks.toLocaleString()} chunks</Pill>
          </div>
        )}

        {/* Phase badge */}
        <div className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: "linear-gradient(135deg,#ec4899,#8b5cf6)" }}>
          Graph-RAG
        </div>
      </header>

      {/* ── Active doc info strip (multi-doc only) ── */}
      {docs.length > 1 && (
        <div className="shrink-0 flex items-center gap-3 border-b border-slate-100 bg-white/60 px-4 py-1.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: docColor(activeIdx).dot }} />
          <span className="text-xs font-semibold text-slate-600 truncate">{activeDoc.filename}</span>
          <span className="text-[11px] text-slate-400">{activeDoc.n_pages} pages · {activeDoc.n_chunks} chunks</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setActiveIdx((i) => Math.max(0, i - 1))} disabled={activeIdx === 0}
              className="p-0.5 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400">{activeIdx + 1}/{docs.length}</span>
            <button onClick={() => setActiveIdx((i) => Math.min(docs.length - 1, i + 1))} disabled={activeIdx === docs.length - 1}
              className="p-0.5 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout: PDF (full height) + Search panel ── */}
      <div className="flex-1 grid min-h-0 gap-2 p-2"
        style={{ gridTemplateColumns: "minmax(0,1.8fr) minmax(0,1fr)" }}>

        {/* PDF viewer — full height */}
        <PdfViewer
          docId={activeDoc.id}
          jumpPage={jumpPage}
          highlights={selectedResult}
        />

        {/* Search panel */}
        <div className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SearchPanel
            docs={docs}
            activeDocId={activeDoc.id}
            crossDoc={crossDoc}
            onCrossDocChange={setCrossDoc}
            selectedResult={selectedResult}
            onResultSelect={handleResultJump}
          />
        </div>

        {/* Knowledge Graph — commented out for now
        <div className="col-span-2 shrink-0 h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <GraphPanel doc={activeDoc} onPageClick={(page) => setJumpPage(page)} />
        </div>
        */}
      </div>
    </div>
  );
}

// ── Small reusable pill ───────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      {children}
    </span>
  );
}
