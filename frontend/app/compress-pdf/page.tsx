"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Zap, FileText, Minimize2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { API_URL } from "@/lib/api";

export default function CompressPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: FileList | File[]) => {
    setError(null);
    const valid = Array.from(newFiles).find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!valid) {
      setError("Please select a valid PDF file.");
      return;
    }
    setFile(valid);
  };

  const handleCompress = async () => {
    if (!file) {
      setError("Please select a PDF file to compress.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/tools/compress`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to compress file");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Omni_Compressed_${file.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <main className="relative min-h-screen bg-[#FAF8F5]" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Tool Header */}
      <header className="h-20 bg-[#FAF8F5] border-b border-slate-100 flex items-center px-6 sm:px-12 fixed top-0 w-full z-50">
        <Link href="/" className="flex items-center gap-2 cursor-pointer mr-8">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#6366F1] shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">Omni</span>
        </Link>
        <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
        <Link href="/#tools" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors ml-2">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back to Tools</span>
        </Link>
      </header>

      <div className="pt-32 pb-20 px-6 flex flex-col items-center justify-center min-h-[90vh]">
        
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-sky-50 pl-1 pr-4 py-1 border border-sky-100">
          <span className="bg-sky-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full"><Minimize2 className="w-3 h-3 inline-block mr-1"/>Power Tool</span>
          <span className="text-sm font-medium text-sky-700">Lossless Compression</span>
        </div>

        <div className="text-center mb-10 w-full">
          <div className="max-w-[1200px] mx-auto mb-4 w-full">
            <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
              <span className="whitespace-nowrap block">Compress PDFs</span>
              <span className="text-sky-500 italic pr-2">without</span> 
              <span className="relative z-10 inline-block">
                losing quality.
                <span className="absolute bottom-1 left-0 w-full h-[28px] bg-amber-300/60 -z-10 rounded-sm transform -rotate-1"></span>
              </span>
            </h1>
          </div>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#6B7280] leading-relaxed">
            Reduce huge file sizes heavily using our garbage-collection engine. Ideal for email limits. 100% Private.
          </p>
        </div>
        
        <div className="w-full max-w-2xl">
          
          <div
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !file && fileRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed px-8 py-10 text-center transition-all duration-300 shadow-sm ${
              dragOver ? "border-sky-500 bg-sky-50/80 scale-[1.02]" : "border-slate-300 bg-[#FAF8F5] hover:border-sky-400 hover:bg-slate-50"
            } ${!file ? "cursor-pointer py-16" : ""}`}
          >
            {!file ? (
              <>
                <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300 ${
                  dragOver ? "bg-sky-600 text-white shadow-lg shadow-sky-200" : "bg-sky-100 text-sky-600 group-hover:bg-sky-200"
                }`}>
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop your PDF here</p>
                <p className="text-sm text-slate-500 mb-6">or click to browse from your computer</p>
              </>
            ) : (
              <div className="text-left w-full flex flex-col gap-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">Ready to compress</h3>
                  <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
                    Change File
                  </button>
                </div>
                
                <div className="relative rounded-xl">
                  {loading && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="absolute inset-0 z-10 bg-[#FAF8F5]/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl border border-sky-100 shadow-inner"
                    >
                      <div className="relative flex items-center justify-center mb-4 mt-2">
                        <div className="absolute w-12 h-12 border-4 border-sky-200 rounded-full"></div>
                        <div className="absolute w-12 h-12 border-4 border-sky-500 rounded-full border-t-transparent animate-spin"></div>
                        <Minimize2 className="w-5 h-5 text-sky-600 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Compressing...</p>
                      <p className="text-xs text-slate-500 font-medium mt-1 mb-2">Stripping dead objects & deflating streams</p>
                    </motion.div>
                  )}
                  
                  <AnimatePresence>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      className={`flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm transition-colors ${loading ? "opacity-40 grayscale" : "hover:border-sky-300"}`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 truncate">{file.name}</span>
                          <span className="text-xs text-slate-400 font-medium">{formatSize(file.size)}</span>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {error && <p className="mt-2 text-sm font-semibold text-red-500 bg-red-50 py-2 px-3 rounded-lg border border-red-100">{error}</p>}
                
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCompress(); }}
                    disabled={loading}
                    className="bg-[#111827] text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-black transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> Optimizing...</>
                    ) : (
                      <>Compress File</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
            onChange={(e) => e.target.files && handleFileChange(e.target.files)} />
          
        </div>
      </div>
    </main>
  );
}

