"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Zap, Brain, Search, ArrowRight, ChevronRight,
  Upload, CheckCircle2, XCircle, Loader2, Plus, X, FileUp,
} from "lucide-react";
import type { DocInfo, BatchProgress, DocProgress } from "@/lib/api";
import { uploadDocumentsBatch } from "@/lib/api";

// ── Particle system ───────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  ox: number; oy: number;
}

function particleColor(hue: number, alpha: number): string {
  const r = Math.round(56 + (2 - 56) * hue);
  const g = Math.round(189 + (132 - 189) * hue);
  const b = Math.round(248 + (199 - 248) * hue);
  return `rgba(${r},${g},${b},${alpha * 0.5})`;
}

function useParticleCanvas(ref: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, animId = 0;
    let particles: Particle[] = [];
    let mx = -9999, my = -9999, t = 0;

    const resize = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      const step = Math.max(9, Math.min(W, H) / 22);
      particles = [];
      for (let px = step / 2; px < W; px += step)
        for (let py = step / 2; py < H; py += step)
          particles.push({ x: px, y: py, vx: 0, vy: 0, ox: px, oy: py });
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
    };
    const onLeave = () => { mx = -9999; my = -9999; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const tick = () => {
      animId = requestAnimationFrame(tick);
      t += 0.012;
      ctx.clearRect(0, 0, W, H);

      const r  = 0.34 * Math.min(W, H);
      const dx_ = Math.sin(2.3 * t) * 60;
      const dy_ = Math.sin(3.1 * t + 1.3) * 40;

      for (const p of particles) {
        const tx = p.ox + dx_, ty = p.oy + dy_;
        const dx = mx - p.x, dy = my - p.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < r && d > 0) {
          const f = (1 - d / r) ** 2 * 3.4;
          p.vx -= (dx / d) * f;
          p.vy -= (dy / d) * f;
        }
        p.vx += (tx - p.x) * 0.024;
        p.vy += (ty - p.y) * 0.024;
        p.vx *= 0.86; p.vy *= 0.86;
        p.x  += p.vx; p.y  += p.vy;

        const disp  = Math.sqrt((p.x - p.ox) ** 2 + (p.y - p.oy) ** 2);
        const alpha = Math.max(0, 0.72 - disp / 70);
        const hue   = (p.ox / W + p.oy / H) / 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = particleColor(hue, alpha);
        ctx.fill();
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [ref]);
}

// ── Stage helpers ─────────────────────────────────────────────────────────────

function stageLabel(dp: DocProgress): string {
  switch (dp.stage) {
    case "queued":    return "Queued…";
    case "parsing":   return "Reading PDF…";
    case "chunking":  return "Chunking text…";
    case "embedding": return dp.total > 0
      ? `Embedding ${dp.processed}/${dp.total} chunks`
      : "Embedding…";
    case "graphing":  return "Building graph…";
    case "done":      return "✓ Done";
    case "error":     return `Error: ${dp.error ?? "unknown"}`;
    default:          return dp.stage;
  }
}

function stageBg(stage: string): string {
  if (stage === "done")  return "linear-gradient(90deg,#10b981,#059669)";
  if (stage === "error") return "#ef4444";
  return "linear-gradient(90deg,#38bdf8,#0284c7)";
}

function stageTextColor(stage: string): string {
  if (stage === "done")  return "#059669";
  if (stage === "error") return "#ef4444";
  return "#8b5cf6";
}

function formatBytes(n: number): string {
  return n < 1024 * 1024
    ? `${(n / 1024).toFixed(0)} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ── File row with progress bar ────────────────────────────────────────────────

function FileRow({
  dp, name, size,
}: { dp: DocProgress | null; name: string; size?: number }) {
  const pct   = dp?.pct   ?? 0;
  const stage = dp?.stage ?? "queued";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {stage === "done"  && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
          {stage === "error" && <XCircle      className="w-3.5 h-3.5 text-red-500 shrink-0" />}
          {stage !== "done" && stage !== "error" && (
            stage === "queued"
              ? <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
              : <Loader2 className="w-3.5 h-3.5 text-sky-500 shrink-0 animate-spin" />
          )}
          <span className="text-xs font-medium text-slate-700 truncate">{name}</span>
          {size != null && (
            <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(size)}</span>
          )}
        </div>
        <span className="text-[10px] shrink-0" style={{ color: stageTextColor(stage) }}>
          {dp ? stageLabel(dp) : "—"}
        </span>
      </div>
      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: stageBg(stage) }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Upload card (multi-file) ──────────────────────────────────────────────────

type Phase = "idle" | "selected" | "uploading" | "done";

function UploadCard({ onReady }: { onReady: (docs: DocInfo[]) => void }) {
  const [phase,    setPhase]    = useState<Phase>("idle");
  const [files,    setFiles]    = useState<File[]>([]);
  const [batch,    setBatch]    = useState<BatchProgress | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<DocInfo[]>([]);

  // Auto-enter workbench 1 s after done
  useEffect(() => {
    if (phase === "done" && doneRef.current.length > 0) {
      onReady(doneRef.current);
    }
  }, [phase, onReady]);

  // Upload a specific list of files — NO state closure, takes list directly
  const doUpload = useCallback(async (toUpload: File[]) => {
    if (!toUpload.length) return;
    setPhase("uploading");
    setBatch(null);
    setError(null);
    const { promise } = uploadDocumentsBatch(
      toUpload,
      setBatch,
      (initialDocs) => {
        // INSTANT REDIRECT TO WORKBENCH IN 0.1 SECONDS!
        if (initialDocs.length > 0) {
          onReady(initialDocs);
        }
      },
    );
    try {
      doneRef.current = await promise;
      setPhase("done");
      if (doneRef.current.length > 0) {
        onReady(doneRef.current);
      }
    } catch (e) {
      setError((e as Error).message ?? "Upload failed");
      setPhase("idle");
    }
  }, [onReady]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const pdfs = Array.from(incoming).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (!pdfs.length) { setError("Only PDF files are accepted."); return; }
    setError(null);
    // Compute merged list synchronously so we can pass it directly to doUpload
    setFiles((prev) => {
      const seen   = new Set(prev.map((f) => f.name));
      const merged = [...prev, ...pdfs.filter((f) => !seen.has(f.name))];
      // Auto-start: pass merged list directly — zero stale-closure risk
      setTimeout(() => doUpload(merged), 0);
      return merged;
    });
    setPhase("selected");
  }, [doUpload]);

  const totalChunks = doneRef.current.reduce((s, d) => s + d.n_chunks, 0);
  const totalPages  = doneRef.current.reduce((s, d) => s + d.n_pages,  0);
  const successN    = batch?.docs?.filter((d) => d.stage === "done").length ?? 0;

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">

        {/* idle */}
        {phase === "idle" && (
          <motion.div key="idle"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <div
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className="relative cursor-pointer rounded-2xl border-2 border-dashed px-8 py-10 text-center transition-all duration-200"
              style={{
                borderColor:    dragOver ? "#38bdf8" : "#cbd5e1",
                background:     dragOver ? "rgba(56,189,248,0.04)" : "rgba(255,255,255,0.8)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "linear-gradient(135deg,#38bdf8,#0284c7)" }}>
                <FileUp className="w-6 h-6 text-white" />
              </div>
              <p className="text-base font-semibold text-slate-700">Drop PDFs here — no limits</p>
              <p className="mt-1 text-sm text-slate-400">or click to browse</p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="text-[11px] font-medium text-slate-500">30–300 pages, same speed</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)} />
            {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
          </motion.div>
        )}

        {/* selected — flash the file list for one tick, then auto-proceeds to uploading */}
        {phase === "selected" && (
          <motion.div key="selected"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white/90 shadow-lg overflow-hidden"
            style={{ backdropFilter: "blur(12px)" }}>
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`}
                  className="flex items-center gap-2 min-w-0 px-4 py-2.5">
                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-sm text-slate-700 truncate">{f.name}</span>
                  <span className="text-xs text-slate-400 shrink-0">{formatBytes(f.size)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3">
              <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              <span className="text-xs text-slate-500 animate-pulse">Starting upload…</span>
            </div>
          </motion.div>
        )}

        {/* uploading — spinner before first SSE frame */}
        {phase === "uploading" && !batch && (
          <motion.div key="connecting"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
            className="rounded-2xl border border-slate-200 bg-white/90 shadow-lg px-6 py-8 text-center"
            style={{ backdropFilter: "blur(12px)" }}>
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Uploading {files.length === 1 ? files[0]?.name : `${files.length} PDFs`}…
            </p>
          </motion.div>
        )}

        {/* uploading — with SSE progress */}
        {phase === "uploading" && batch && (
          <motion.div key="uploading"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="rounded-2xl border border-slate-200 bg-white/90 shadow-lg overflow-hidden"
            style={{ backdropFilter: "blur(12px)" }}>
            {/* Overall bar */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                  Processing {batch.docs.length} {batch.docs.length === 1 ? "document" : "documents"}
                </span>
                <span className="text-sm font-bold tabular-nums"
                  style={{ background: "linear-gradient(135deg,#38bdf8,#0284c7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {batch.pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#38bdf8,#0284c7)" }}
                  animate={{ width: `${batch.pct}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }} />
              </div>
            </div>
            {/* Per-file rows */}
            <div className="px-4 py-3 flex flex-col gap-3 max-h-64 overflow-y-auto">
              {batch.docs.map((dp, i) => (
                <FileRow key={dp.doc_id} dp={dp}
                  name={files[i]?.name ?? dp.filename}
                  size={files[i]?.size} />
              ))}
            </div>
          </motion.div>
        )}

        {/* done */}
        {phase === "done" && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-emerald-200 bg-white/90 shadow-lg px-6 py-6 text-center"
            style={{ backdropFilter: "blur(12px)" }}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <p className="text-base font-bold text-slate-800">
              {successN === 1 ? "Document ready" : `${successN} documents ready`}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {totalPages.toLocaleString()} pages · {totalChunks.toLocaleString()} chunks indexed
            </p>
            <p className="mt-3 text-xs text-slate-400 animate-pulse">Opening workbench…</p>
            {/* Tap to skip the 1 s delay */}
            <button
              onClick={() => onReady(doneRef.current)}
              className="mt-2 text-xs text-sky-500 hover:underline">
              Open now
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ── Landing sections ──────────────────────────────────────────────────────────

function FeaturesSection() {
  const items = [
    { icon: Brain,    title: "Semantic chunking",   desc: "Topic-aware splits preserve context across page breaks. No arbitrary size limits." },
    { icon: Search,   title: "Hybrid retrieval",    desc: "BM25 + dense vectors fused with RRF. Lexical reranker sharpens top-k results." },
    { icon: FileText, title: "Exact citations",     desc: "Every answer traces back to the sentence, page and bounding box — no hallucinations." },
    { icon: Zap,      title: "Knowledge graph",     desc: "Entity co-occurrence graph auto-built per document, navigable in the workbench." },
  ];
  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-sky-500 mb-2">Capabilities</p>
        <h2 className="text-center text-3xl font-bold text-slate-800 mb-12">Built for real documents</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "linear-gradient(135deg,#38bdf8,#0284c7)" }}>
                <f.icon className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { n: "01", title: "Upload PDFs",    desc: "Drop 1–50 documents. Files up to 1,000 pages process asynchronously with live progress." },
    { n: "02", title: "Ask anything",   desc: "Hybrid search spans all your documents simultaneously to find the best passages." },
    { n: "03", title: "Get answers",    desc: "Results link to the exact page and sentence. Click any citation to jump there." },
  ];
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-sky-500 mb-2">How it works</p>
        <h2 className="text-center text-3xl font-bold text-slate-800 mb-12">Three steps to clarity</h2>
        <div className="flex flex-col sm:flex-row relative">
          {steps.map((s, i) => (
            <div key={s.n} className="flex-1 relative px-6 py-6 text-center">
              {i < steps.length - 1 && (
                <ChevronRight className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 z-10" />
              )}
              <div className="mx-auto mb-3 text-3xl font-black"
                style={{ background: "linear-gradient(135deg,#38bdf8,#0284c7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.n}
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-1">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PerformanceSection() {
  const stats = [
    { val: "~2.7 ms", label: "Median query latency", note: "hybrid mode, 10 k chunks" },
    { val: "< 1 s",   label: "Index 300-page PDF",   note: "HashingEmbedder, M1 Pro" },
    { val: "0 bytes", label: "External API calls",   note: "fully local & private" },
    { val: "50+",     label: "Simultaneous PDFs",    note: "single batch upload" },
  ];
  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-sky-500 mb-2">Performance</p>
        <h2 className="text-center text-3xl font-bold text-slate-800 mb-12">30–300 pages, same speed</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.val} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-center">
              <div className="text-3xl font-black mb-1"
                style={{ background: "linear-gradient(135deg,#38bdf8,#0ea5e9,#0284c7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.val}
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-0.5">{s.label}</p>
              <p className="text-xs text-slate-400">{s.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechStackSection() {
  const stack = [
    ["FastAPI",         "Python API server"],
    ["Next.js 15",      "React 19 frontend"],
    ["PyMuPDF",         "PDF parsing + layout"],
    ["BM25 + RRF",      "Sparse-dense fusion"],
    ["Framer Motion",   "Fluid animations"],
    ["HashingEmbedder", "Zero-dependency vectors"],
  ];
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-sky-500 mb-2">Tech stack</p>
        <h2 className="text-center text-3xl font-bold text-slate-800 mb-10">Built on solid foundations</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {stack.map(([name, desc]) => (
            <div key={name} className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="text-sm font-semibold text-slate-800">{name}</span>
              <span className="ml-2 text-xs text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function HeroUpload({ onReady }: { onReady: (docs: DocInfo[]) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useParticleCanvas(canvasRef as React.RefObject<HTMLCanvasElement | null>);

  return (
    <div className="min-h-screen bg-sky-50/50" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>

      {/* ── Hero section ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
        <canvas ref={canvasRef}
          className="pointer-events-none absolute inset-0 w-full h-full" aria-hidden />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(56,189,248,0.08) 0%, transparent 70%)" }}
          aria-hidden />

        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur">
          <Brain className="w-3.5 h-3.5 text-sky-500" />
          <span className="text-xs font-semibold text-slate-600">Graph-RAG · Hybrid Retrieval · Exact Citations</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-4">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none text-slate-800">
            Ask your documents.
          </h1>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none"
            style={{ background: "linear-gradient(135deg,#38bdf8 0%,#0ea5e9 50%,#0284c7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Get exact answers.
          </h1>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mb-10 max-w-xl text-center text-lg text-slate-500">
          Upload 1–50 PDFs. CogniGraph indexes every page, builds a knowledge graph, and answers
          any question with citations pointing to the exact paragraph.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }} className="w-full max-w-xl">
          <UploadCard onReady={onReady} />
        </motion.div>
      </section>

      <FeaturesSection />
      <HowItWorksSection />
      <PerformanceSection />
      <TechStackSection />

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to explore your documents?</h2>
          <p className="text-slate-500 mb-8">
            Drop your PDFs above and get answers in seconds — no cloud, no API key, no limits.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg hover:scale-[1.03] transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#38bdf8,#0284c7)" }}>
            <Upload className="w-4 h-4" /> Upload your first PDF
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#38bdf8,#0284c7)" }}>
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-700">CogniGraph AI</span>
          </div>
          <p className="text-xs text-slate-400">Autonomous Graph-RAG · runs entirely on your machine</p>
        </div>
      </footer>
    </div>
  );
}
