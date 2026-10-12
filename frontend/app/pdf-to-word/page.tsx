"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Zap, FileText, FileType2, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { API_URL } from "@/lib/api";

export default function PdfToWordTool() {
  const [file, setFile]           = useState<File | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [processTime, setProcessTime] = useState<string | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: FileList | File[]) => {
    setError(null); setProcessTime(null);
    const valid = Array.from(newFiles).find(
      f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!valid) { setError("Please select a valid PDF file."); return; }
    setFile(valid);
  };

  const handleConvert = async () => {
    if (!file) { setError("Please select a PDF file."); return; }
    setLoading(true); setError(null); setProcessTime(null);
    const t0 = performance.now();
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_URL}/api/tools/pdf-to-word`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Conversion failed");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Omni_Word_${file.name.replace(".pdf", "")}.docx`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
      setProcessTime(((performance.now() - t0) / 1000).toFixed(2));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#FAF8F5]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header className="h-20 bg-[#FAF8F5] border-b border-slate-100 flex items-center px-6 sm:px-12 fixed top-0 w-full z-50">
        <Link href="/" className="flex items-center gap-2 mr-8">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-600 shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">Omni</span>
        </Link>
        <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />
        <Link href="/#tools" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors ml-2">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back to Tools</span>
        </Link>
      </header>

      <div className="pt-28 pb-16 px-4 sm:px-6 flex flex-col items-center justify-center min-h-[90vh]">

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 pl-1 pr-4 py-1 border border-emerald-100">
          <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            <FileType2 className="w-3 h-3 inline-block mr-1" />Free Forever
          </span>
          <span className="text-sm font-medium text-emerald-700">No sign-up · No limits</span>
        </div>

        {/* Headline */}
        <div className="text-center mb-10 w-full">
          <div className="max-w-[1200px] mx-auto mb-4 w-full">
            <h1 className="text-[1.75rem] sm:text-5xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
              <span className="block sm:whitespace-nowrap">PDF to Word.</span>
              <span className="text-emerald-500 italic pr-2">Editable,</span>
              <span className="relative z-10 inline-block">
                instantly.
                <span className="absolute bottom-1 left-0 w-full h-[28px] bg-amber-300/60 -z-10 rounded-sm transform -rotate-1" />
              </span>
            </h1>
          </div>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#6B7280] leading-relaxed">
            Convert any PDF into a fully editable .docx Word file. Layout preserved, text extracted, ready to edit — 100% offline.
          </p>
        </div>

        <div className="w-full max-w-2xl">

          {/* Drop Zone */}
          <div
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !file && fileRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed px-4 py-6 sm:px-8 sm:py-10 text-center transition-all duration-300 shadow-sm ${
              dragOver ? "border-emerald-500 bg-emerald-50/80 scale-[1.02]" : "border-slate-300 bg-[#FAF8F5] hover:border-emerald-400 hover:bg-slate-50"
            } ${!file ? "cursor-pointer py-10 sm:py-16" : ""}`}
          >
            {!file ? (
              <>
                <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
                  dragOver ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-emerald-100 text-emerald-600"
                }`}>
                  <FileType2 className="w-8 h-8" />
                </div>
                <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop your PDF here</p>
                <p className="text-sm text-slate-500 mb-6">or click to browse — converts to .docx Word format</p>
              </>
            ) : (
              <div className="text-left w-full flex flex-col gap-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">Ready to convert</h3>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"
                  >
                    Change File
                  </button>
                </div>

                <div className="relative rounded-xl">
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="absolute inset-0 z-10 bg-[#FAF8F5]/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl border border-emerald-100 shadow-inner"
                    >
                      <div className="relative flex items-center justify-center mb-4 mt-2">
                        <div className="absolute w-12 h-12 border-4 border-emerald-200 rounded-full" />
                        <div className="absolute w-12 h-12 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                        <FileType2 className="w-5 h-5 text-emerald-600 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Converting to Word...</p>
                      <p className="text-xs text-slate-500 font-medium mt-1 mb-2">Extracting layout, text blocks & structure</p>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm ${loading ? "opacity-40 grayscale" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-semibold text-slate-700 truncate">{file.name}</span>
                        <span className="text-xs text-slate-400 font-medium">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB → will become .docx
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {error && (
                  <p className="mt-2 text-sm font-semibold text-red-600 bg-red-50 py-2 px-3 rounded-lg border border-red-100">
                    {error}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {processTime && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm"
                      >
                        <Download className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-bold">Done in {processTime}s — Check your Downloads</span>
                      </motion.div>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleConvert(); }}
                    disabled={loading}
                    className="w-full sm:w-auto justify-center bg-slate-900 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-black transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Converting...</>
                    ) : (
                      <><FileType2 className="w-4 h-4" /> Convert to Word</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
            onChange={e => e.target.files && handleFileChange(e.target.files)} />
        </div>
      </div>
    </main>
  );
}
