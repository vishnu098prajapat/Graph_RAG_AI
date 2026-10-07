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

export function UploadCard({ onReady }: { onReady: (docs: DocInfo[]) => void }) {
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
              className={`relative cursor-pointer rounded-3xl border-2 border-dashed px-8 py-16 text-center transition-all duration-300 shadow-sm hover:shadow-md ${
                dragOver ? "border-indigo-500 bg-indigo-50/80 scale-[1.02]" : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50"
              }`}
            >
              <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300 ${
                dragOver ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200"
              }`}>
                <FileUp className="w-8 h-8" />
              </div>
              <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop your documents here</p>
              <p className="text-sm text-slate-500 mb-6">or click to browse from your computer</p>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-4 py-1.5 shadow-sm">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Supports up to 10,000 pages</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)} />
            {error && <p className="mt-4 text-center text-sm font-semibold text-red-500 bg-red-50 py-2 rounded-lg border border-red-100">{error}</p>}
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

// ── Premium SaaS Landing Sections ──────────────────────────────────────────────────────────

function OmniHeader() {
  return (
    <header className="fixed top-0 inset-x-0 h-16 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 sm:px-12">
      <div className="flex items-center gap-2 cursor-pointer">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-sky-400 to-sky-600 shadow-sm">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-xl font-black tracking-tight text-slate-800">Omni</span>
      </div>
      <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
        <a href="#" className="hover:text-sky-500 transition-colors">Tools</a>
        <a href="#" className="hover:text-sky-500 transition-colors">Pricing</a>
        <a href="#" className="hover:text-sky-500 transition-colors">API</a>
        <a href="#" className="hover:text-sky-500 transition-colors">About</a>
      </nav>
      <div className="flex items-center gap-4">
        <button className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-sky-500 transition-colors">Log in</button>
        <button className="text-sm font-bold text-white bg-slate-800 px-5 py-2 rounded-full hover:bg-slate-700 transition-colors shadow-sm">
          Sign up
        </button>
      </div>
    </header>
  );
}

function MicroToolsGrid() {
  const tools = [
    { icon: Brain, title: "Chat with Document", desc: "Interact with massive 10,000-page files instantly without limits." },
    { icon: Search, title: "Legal Contract Analyzer", desc: "Instantly find loopholes, hidden clauses, and risks in legal documents." },
    { icon: Plus, title: "Merge Heavy Files", desc: "Combine 500MB+ documents seamlessly. Zero file-size restrictions." },
    { icon: FileText, title: "Extract Pages", desc: "Split or pull out specific pages from heavy books and magazines." },
    { icon: Zap, title: "Compress Document", desc: "Reduce huge file sizes heavily without losing visual quality." },
    { icon: XCircle, title: "Unlock & Decrypt", desc: "Remove passwords from protected files in bulk securely." },
  ];
  return (
    <section className="py-24 px-6 bg-slate-50 border-t border-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight mb-4">One Workspace. Every Tool You Need.</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">Stop paying premium fees for basic tasks. We provide the fastest, unrestricted document suite on the internet.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((t) => (
            <div key={t.title} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-sky-200 transition-all cursor-pointer group">
              <div className="h-12 w-12 rounded-xl bg-sky-50 flex items-center justify-center mb-5 group-hover:bg-sky-500 transition-colors">
                <t.icon className="w-5 h-5 text-sky-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{t.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-6">100% Private. Zero Retention.</h2>
        <p className="text-slate-500 text-lg leading-relaxed mb-8">
          We are so private that we don't even own a database. Your files are processed entirely in ephemeral memory. 
          The moment you close your tab, our servers automatically self-destruct your data. No traces left behind.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-emerald-600 font-semibold text-sm border border-emerald-100">
          <CheckCircle2 className="w-4 h-4" /> End-to-end Ephemeral Processing
        </div>
      </div>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function HeroUpload({ onReady }: { onReady: (docs: DocInfo[]) => void }) {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <OmniHeader />

      {/* ── Hero section ── */}
      <section className="relative flex flex-col items-center justify-center pt-32 pb-20 px-6 min-h-[90vh]">
        
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(56,189,248,0.1) 0%, transparent 70%)" }}
          aria-hidden />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Version 2.0 is Live</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-6 max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight text-slate-900 mb-4">
            Your Universal Workspace.
          </h1>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight"
            style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            No Limits. No Sign-ups.
          </h1>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-12 max-w-xl text-center text-lg text-slate-500 leading-relaxed">
          The fastest, most secure suite of document tools. Drop massive files up to 10,000 pages and let our engine do the heavy lifting in seconds.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }} className="w-full max-w-xl relative z-10">
          <UploadCard onReady={onReady} />
        </motion.div>
      </section>

      <MicroToolsGrid />
      <PrivacySection />

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-12 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md flex items-center justify-center bg-slate-800">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-800">Omni</span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-slate-800 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-800 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-800 transition-colors">Contact</a>
          </div>
          <p className="text-sm text-slate-400">© 2026 Omni Workspace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
