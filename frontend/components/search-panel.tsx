"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Zap, FileText, ChevronDown, ChevronUp, Layers,
} from "lucide-react";
import type { DocInfo, SearchResult, SearchMode, QueryResponse } from "@/lib/api";
import { queryDocument, queryDocuments } from "@/lib/api";
import { docColor } from "@/components/workbench";

// ── Highlight query terms ─────────────────────────────────────────────────────

function highlightTerms(text: string, query: string): string {
  if (!query.trim()) return text;
  const terms = query
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!terms.length) return text;
  const re = new RegExp(`(${terms.join("|")})`, "gi");
  return text.replace(re, `<mark style="background:rgba(99,102,241,0.2);color:#3730a3;font-weight:600;border-radius:3px;padding:0 2px;">$1</mark>`);
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({
  result,
  query,
  rank,
  docs,
  isSelected,
  onSelect,
}: {
  result: SearchResult;
  query: string;
  rank: number;
  docs: DocInfo[];
  isSelected: boolean;
  onSelect: (r: SearchResult, q: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pages = result.citations?.map((c) => c.page) || [];
  const uniquePages = Array.from(new Set(pages)).sort((a, b) => a - b);

  let matchingPage: number | null = null;
  if (query && result.citations && result.citations.length > 0) {
    const q = query.toLowerCase().trim();
    const terms = q.split(/\s+/).filter((t) => t.length > 1);
    if (terms.length > 0) {
      const match = result.citations.find((c) => {
        const cText = (c as { text?: string }).text?.toLowerCase() || "";
        return terms.some((t) => cText.includes(t));
      });
      if (match) matchingPage = match.page;
    }
  }

  const pageText = matchingPage != null
    ? `Page ${matchingPage}`
    : uniquePages.length > 1
    ? `Pages ${uniquePages[0]}-${uniquePages[uniquePages.length - 1]}`
    : uniquePages.length === 1
    ? `Page ${uniquePages[0]}`
    : null;
  const docIdx    = docs.findIndex((d) => d.id === result.doc_id);
  const color     = docIdx >= 0 ? docColor(docIdx) : { dot: "#0ea5e9", bg: "rgba(14,165,233,0.1)", text: "#3730a3" };
  const docInfo   = docIdx >= 0 ? docs[docIdx] : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => onSelect(result, query)}
      className="cursor-pointer rounded-xl border p-3 transition-all duration-150 hover:shadow-md"
      style={{
        borderColor: isSelected ? "#c7d2fe" : "#e0e7ff",
        background:  isSelected ? "rgba(238,242,255,0.8)" : "white",
      }}
    >
      {/* Top row: rank + doc badge + page */}
      <div className="flex items-center gap-2 mb-2">
        {/* Rank badge */}
        <span className="shrink-0 text-[10px] font-black text-white rounded-full w-5 h-5 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#818cf8,#4f46e5)" }}>
          {rank}
        </span>

        {/* Doc name badge (shown in cross-doc mode) */}
        {docInfo && docs.length > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold truncate max-w-[120px]"
            style={{ background: color.bg, color: color.text }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color.dot }} />
            {docInfo.filename.replace(/\.pdf$/i, "")}
          </span>
        )}

        {/* Page badge — prominent */}
        {pageText != null && (
          <span className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm"
            style={{ background: "#e0e7ff", color: "#3730a3", border: "1px solid #bae6fd" }}>
            {pageText}
          </span>
        )}

        {/* Score */}
        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 tabular-nums">
          {(result.score * 100).toFixed(1)}%
        </span>

        {/* Expand toggle */}
        <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
          {expanded
            ? <ChevronUp  className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Text excerpt — more lines so highlighted terms are visible */}
      <p
        className={`text-xs text-slate-700 leading-relaxed ${expanded ? "" : "line-clamp-5"}`}
        dangerouslySetInnerHTML={{ __html: highlightTerms(result.text, query) }}
      />

      {/* Expanded: signals + all citations */}
      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2 }} className="overflow-hidden">
          <div className="mt-3 rounded-lg bg-white p-2.5 text-[10px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700 mb-1">Retrieval signals</p>
            {result.signals.dense_rank  != null && <p>Dense rank:   <span className="text-indigo-600 font-medium">#{result.signals.dense_rank}</span></p>}
            {result.signals.sparse_rank != null && <p>Sparse rank:  <span className="text-indigo-600 font-medium">#{result.signals.sparse_rank}</span></p>}
            {result.signals.rerank      != null && <p>Rerank score: <span className="text-emerald-600 font-medium">{result.signals.rerank.toFixed(3)}</span></p>}
            <p>RRF score: <span className="text-slate-700 font-medium">{result.signals.rrf.toFixed(4)}</span></p>
          </div>
          {result.citations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.citations.map((c, i) => (
                <span key={i}
                  className="rounded-full bg-indigo-50/50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                  p.{c.page}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Main search panel ─────────────────────────────────────────────────────────

interface SearchPanelProps {
  docs: DocInfo[];
  activeDocId: string;
  crossDoc: boolean;
  onCrossDocChange: (v: boolean) => void;
  selectedResult: SearchResult | null;
  onResultSelect: (r: SearchResult, query: string) => void;
}

export function SearchPanel({
  docs,
  activeDocId,
  crossDoc,
  onCrossDocChange,
  selectedResult,
  onResultSelect,
}: SearchPanelProps) {
  const [query,    setQuery]    = useState("");
  const [mode,     setMode]     = useState<SearchMode>("hybrid");
  const [topK,     setTopK]     = useState(5);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      let res: QueryResponse;
      if (crossDoc && docs.length > 1) {
        // Cross-doc: search across ALL currently loaded docs by their IDs
        res = await queryDocuments(docs.map(d => d.id), query, mode, topK, ctrl.signal);
      } else {
        // Single-doc or "This Document" mode: search only the active doc
        res = await queryDocument(activeDocId, query, mode, topK, ctrl.signal);
      }
      setResponse(res);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message ?? "Search failed");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const timings = response?.timings_ms;
  const validResults = response?.results.filter(r => r.score >= 0.01) || [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-indigo-500" />
            Search
          </h2>
          {/* Cross-doc toggle (only when multiple docs) */}
          {docs.length > 1 && (
            <button
              onClick={() => onCrossDocChange(!crossDoc)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all"
              style={{
                background: crossDoc
                  ? "linear-gradient(135deg,#818cf8,#4f46e5)"
                  : "rgba(0,0,0,0.04)",
                color: crossDoc ? "white" : "#64748b",
              }}
            >
              <Layers className="w-3 h-3" />
              {crossDoc ? "All Documents" : "This Document"}
            </button>
          )}
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={crossDoc && docs.length > 1 ? "Search all documents…" : "Ask a question…"}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Mode pills */}
          <div className="flex items-center gap-1.5">
            {(["hybrid", "dense", "sparse"] as SearchMode[]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all"
                style={{
                  background: mode === m ? "linear-gradient(135deg,#818cf8,#4f46e5)" : "transparent",
                  color:      mode === m ? "white" : "#94a3b8",
                  border:     `1px solid ${mode === m ? "transparent" : "#e2e8f0"}`,
                }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="w-full rounded-xl py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#818cf8,#4f46e5)" }}>
            {loading
              ? <><span className="animate-spin text-xs">⟳</span> Searching…</>
              : <><Search className="w-3.5 h-3.5" /> Search</>}
          </button>
        </form>
      </div>

      {/* ── Results ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Timings */}
        {timings && !error && (
          <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5 text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(timings).map(([k, v]) => (
              <span key={k}>
                {k}:{" "}
                <span className="font-semibold text-indigo-600">{v.toFixed(1)} ms</span>
              </span>
            ))}
            <span className="ml-auto font-semibold text-slate-600">
              {validResults.length} results
              {crossDoc && docs.length > 1 && (
                <span className="ml-1 text-indigo-500">· all docs</span>
              )}
            </span>
          </div>
        )}

        {/* Empty state when filtering removes all results */}
        {response && validResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-slate-400">
            <p className="text-xs font-semibold">No highly relevant results found</p>
            <p className="text-[11px] mt-1 text-slate-500 text-center">
              The AI couldn't find any strong matches in the document. Try a different search term or check your spelling.
            </p>
          </div>
        )}

        {/* Result cards */}
        {validResults.map((r, i) => (
          <ResultCard
            key={r.chunk_id}
            result={r}
            query={query}
            rank={i + 1}
            docs={docs}
            isSelected={selectedResult?.chunk_id === r.chunk_id}
            onSelect={onResultSelect}
          />
        ))}

        {/* Empty state */}
        {!loading && !error && response && response.results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">No results found.</p>
            <p className="text-xs text-slate-300 mt-1">Try different keywords or a broader query.</p>
          </div>
        )}

        {/* Placeholder */}
        {!response && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(56,189,248,0.15),rgba(2,132,199,0.15))" }}>
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">Ask anything about your documents</p>
            <p className="text-xs text-slate-400 mt-1">
              {docs.length > 1
                ? `Searching across ${docs.length} documents · ${docs.reduce((s, d) => s + d.n_chunks, 0).toLocaleString()} chunks`
                : `${docs[0]?.n_chunks.toLocaleString() ?? 0} chunks indexed`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

