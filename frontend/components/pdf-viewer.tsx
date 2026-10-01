"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { Citation } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface Focus {
  key: string; // change the key to re-trigger navigation, even to the same page
  page: number;
}

interface Props {
  url: string;
  numPages: number;
  highlights: Citation[];
  citedPages: number[];
  focus: Focus | null;
}

export function PdfViewer({ url, numPages, highlights, citedPages, focus }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(0);
  const [scale, setScale] = useState(1); // CSS pixels per PDF point
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the document (pdf.js is imported lazily: it must never run during SSR).
  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    setPdf(null);
    setError(null);
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const doc = await pdfjs.getDocument({ url }).promise;
      if (cancelled) return void doc.destroy();
      loaded = doc;
      setPdf(doc);
    })().catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load PDF"));
    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
  }, [url]);

  // Track container width so the page always fits the panel.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(0, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Jump to the cited page when a result is selected.
  useEffect(() => {
    if (focus) setPage(Math.min(Math.max(focus.page, 1), numPages));
  }, [focus, numPages]);

  // Render the current page to canvas.
  useEffect(() => {
    if (!pdf || width < 50) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    setRendering(true);
    (async () => {
      const p = await pdf.getPage(page);
      const cssScale = width / p.getViewport({ scale: 1 }).width;
      const dpr = window.devicePixelRatio || 1;
      const viewport = p.getViewport({ scale: cssScale * dpr });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      task = p.render({ canvas, viewport });
      await task.promise;
      if (!cancelled) {
        setScale(cssScale);
        setRendering(false);
      }
    })().catch((e: unknown) => {
      if (e instanceof Error && e.name === "RenderingCancelledException") return;
      if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render page");
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, page, width]);

  const pageHighlights = highlights.filter((c) => c.page === page);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <div className="flex items-center gap-1">
          <NavButton label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </NavButton>
          <span className="min-w-[5.5rem] text-center text-xs tabular-nums text-zinc-400">
            Page {page} / {numPages}
          </span>
          <NavButton label="Next page" disabled={page >= numPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </NavButton>
        </div>
        {citedPages.length > 0 && (
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            <span className="shrink-0 text-[11px] text-zinc-500">Cited on</span>
            {citedPages.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[11px] tabular-nums transition-colors",
                  p === page ? "bg-accent/20 text-accent-soft" : "bg-white/5 text-zinc-400 hover:bg-white/10",
                )}
              >
                p.{p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div ref={wrapRef} className="relative mx-auto w-full max-w-[900px]">
          {error ? (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
          ) : (
            <div className="relative w-fit overflow-hidden rounded-md bg-white shadow-2xl shadow-black/60 ring-1 ring-white/10">
              <canvas ref={canvasRef} className="block" />
              <AnimatePresence>
                {!rendering &&
                  pageHighlights.flatMap((c, ci) =>
                    c.rects.map((r, ri) => (
                      <motion.div
                        key={`${page}-${ci}-${ri}-${focus?.key ?? ""}`}
                        initial={{ opacity: 0, scaleY: 0.6 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: ri * 0.03, duration: 0.25 }}
                        className="pointer-events-none absolute rounded-[2px] bg-yellow-300/40 mix-blend-multiply ring-1 ring-yellow-500/60"
                        style={{
                          left: r[0] * scale - 1,
                          top: r[1] * scale - 1,
                          width: (r[2] - r[0]) * scale + 2,
                          height: (r[3] - r[1]) * scale + 2,
                        }}
                      />
                    )),
                  )}
              </AnimatePresence>
            </div>
          )}
          {(rendering || !pdf) && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavButton(props: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      className="rounded p-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {props.children}
    </button>
  );
}
