"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Layers, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import type { DocInfo, SearchResult } from "@/lib/api";
import { SearchPanel } from "@/components/search-panel";
import { GraphPanel } from "@/components/graph-panel";

// ── Doc tab colors (cycles through for each doc) ──────────────────────────────

const DOC_COLORS = [
  { dot: "#0ea5e9", bg: "rgba(14,165,233,0.1)",  text: "#0369a1" },
  { dot: "#0284c7", bg: "rgba(2,132,199,0.1)",   text: "#075985" },
  { dot: "#38bdf8", bg: "rgba(56,189,248,0.15)", text: "#0284c7" },
  { dot: "#10b981", bg: "rgba(16,185,129,0.1)",  text: "#047857" },
  { dot: "#6366f1", bg: "rgba(99,102,241,0.1)",  text: "#4338ca" },
  { dot: "#f59e0b", bg: "rgba(245,158,11,0.1)",  text: "#b45309" },
];

export function docColor(idx: number) {
  return DOC_COLORS[idx % DOC_COLORS.length];
}

// ── PDF viewer ────────────────────────────────────────────────────────────────

function PdfViewer({
  docId,
  jumpPage,
  jumpKey,
  highlights,
  query,
}: {
  docId: string;
  jumpPage: number;
  jumpKey?: number;
  highlights: SearchResult | null;
  query?: string;
}) {
  const { pdfUrl } = require("@/lib/api") as typeof import("@/lib/api");
  let src = `${pdfUrl(docId)}#page=${jumpPage}&view=Fit`;
  if (query) {
    src += `&search=${encodeURIComponent(query)}`;
  }

  // Use jumpKey to force iframe reload when clicking same page results
  const iframeKey = `${src}-${jumpKey || 0}`;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
      <iframe
        key={iframeKey}
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
  const [activeIdx,      setActiveIdx]      = useState(0);
  const [jumpPage,       setJumpPage]       = useState(1);
  const [jumpKey,        setJumpKey]        = useState(0);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [crossDoc,       setCrossDoc]       = useState(docs.length > 1);

  const activeDoc = docs[activeIdx] ?? docs[0];

  // When a search result is clicked: switch doc tab + jump to exact matching page
  const handleResultJump = useCallback((result: SearchResult, query: string) => {
    const targetIdx = docs.findIndex((d) => d.id === result.doc_id);
    if (targetIdx !== -1) {
      setActiveIdx(targetIdx);
    }

    // Find the exact citation page that contains the query search terms!
    let targetPage = result.citations?.[0]?.page ?? 1;
    if (query && result.citations && result.citations.length > 1) {
      const q = query.toLowerCase().trim();
      const terms = q.split(/\s+/).filter((t) => t.length > 1);
      if (terms.length > 0) {
        const matchingCitation = result.citations.find((c) => {
          const cText = (c as { text?: string }).text?.toLowerCase() || "";
          return terms.some((t) => cText.includes(t));
        });
        if (matchingCitation) {
          targetPage = matchingCitation.page;
        }
      }
    }

    setJumpPage(targetPage);
    setSelectedResult(result);
    setSearchQuery(query);
    // Always bump jumpKey so iframe is forced to reload (even same doc/page)
    setJumpKey(Date.now());
  }, [docs]);

  const totalPages  = useMemo(() => docs.reduce((s, d) => s + d.n_pages,  0), [docs]);
  const totalChunks = useMemo(() => docs.reduce((s, d) => s + d.n_chunks, 0), [docs]);

  return (
    <div className="flex flex-col min-h-screen overflow-y-auto bg-sky-50 pb-8">

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center gap-3 border-b border-sky-100 px-4 py-2.5"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>

        {/* Back */}
        <button onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg border border-sky-100 bg-white px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 transition-colors shrink-0">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Branding */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#38bdf8,#0ea5e9)" }}>
            <span className="text-white text-[10px] font-black">C</span>
          </div>
          <span className="text-sm font-bold text-sky-900 hidden sm:block">CogniGraph</span>
        </div>

        <div className="w-px h-4 bg-slate-200 shrink-0" />

        {/* Doc tabs — scrollable when many */}
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 scrollbar-none">
          {docs.length === 1 ? (
            /* Single doc: show filename + stats inline */
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
                style={{ background: "linear-gradient(135deg,#38bdf8,#0ea5e9)" }}>
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-sky-900 truncate max-w-[200px]">
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
                  <button key={doc.id} onClick={() => {
                    setActiveIdx(i);
                    setJumpPage(1);
                    setSelectedResult(null);
                    setSearchQuery("");
                  }}
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

        {/* ── Processing Timings (Right side) ── */}
        {activeDoc.timings_ms && Object.keys(activeDoc.timings_ms).length > 0 && (
          <div className="ml-auto hidden xl:flex shrink-0 items-center gap-3 rounded-xl bg-sky-50/80 border border-sky-100 px-3 py-1.5 text-[10px] text-sky-700 shadow-sm">
            <span className="font-semibold opacity-70 flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" /> Indexed in:</span>
            {Object.entries(activeDoc.timings_ms).map(([k, v]) => (
              <span key={k}>
                {k}: <span className="font-bold text-sky-600">{(v as number).toFixed(1)} ms</span>
              </span>
            ))}
          </div>
        )}

      </header>

      {/* ── Active doc info strip (multi-doc only) ── */}
      {docs.length > 1 && (
        <div className="shrink-0 flex items-center gap-3 border-b border-slate-100 bg-white/60 px-4 py-1.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: docColor(activeIdx).dot }} />
          <span className="text-xs font-semibold text-sky-700 truncate">{activeDoc.filename}</span>
          <span className="text-[11px] text-slate-400">{activeDoc.n_pages} pages · {activeDoc.n_chunks} chunks</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setActiveIdx((i) => Math.max(0, i - 1))} disabled={activeIdx === 0}
              className="p-0.5 rounded text-slate-400 hover:text-sky-700 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400">{activeIdx + 1}/{docs.length}</span>
            <button onClick={() => setActiveIdx((i) => Math.min(docs.length - 1, i + 1))} disabled={activeIdx === docs.length - 1}
              className="p-0.5 rounded text-slate-400 hover:text-sky-700 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout: PDF + Search ── */}
      <div className="flex-none flex flex-col xl:flex-row gap-4 sm:gap-6 p-3 sm:p-6 w-full max-w-[96%] mx-auto items-stretch xl:items-start justify-center">
        
        {/* Left: PDF viewer */}
        <div className="w-full xl:flex-1 h-[65vh] sm:h-[78vh] xl:h-[88vh] flex flex-col shadow-lg rounded-2xl overflow-hidden border border-sky-200" style={{ flex: 1.8 }}>
          <PdfViewer
            docId={activeDoc.id}
            jumpPage={jumpPage}
            jumpKey={jumpKey}
            highlights={selectedResult}
            query={searchQuery}
          />
        </div>

        {/* Right: Search panel */}
        <div className="w-full xl:w-[450px] shrink-0 h-[55vh] sm:h-[65vh] xl:h-[88vh] flex flex-col">
          <div className="flex-1 overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-md transition-all duration-300 hover:shadow-lg">
            <SearchPanel
              docs={docs}
              activeDocId={activeDoc.id}
              crossDoc={crossDoc}
              onCrossDocChange={setCrossDoc}
              selectedResult={selectedResult}
              onResultSelect={handleResultJump}
            />
          </div>
        </div>
      </div>

      {/* ── Graph Section ── */}
      <div className="flex-none w-full max-w-[96%] mx-auto px-3 sm:px-6 pb-6">
        <h2 className="text-lg sm:text-xl font-bold text-sky-900 mb-3 sm:mb-4 px-1 sm:px-2">Knowledge Graph ({activeDoc.filename})</h2>
        <div className="h-[55vh] sm:h-[65vh] xl:h-[75vh] shadow-lg rounded-2xl overflow-hidden border border-sky-200 bg-white">
          <GraphPanel 
            doc={activeDoc} 
            onPageClick={(p) => { 
              setJumpPage(p); 
              setJumpKey(Date.now()); 
              window.scrollTo({ top: 0, behavior: "smooth" }); 
            }} 
          />
        </div>
      </div>

    </div>
  );
}

// ── Small reusable pill ───────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      {children}
    </span>
  );
}
