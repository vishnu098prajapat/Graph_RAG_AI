"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Zap, FileText, Scissors, FileOutput, Key } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { API_URL } from "@/lib/api";

export default function ExtractPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: FileList | File[]) => {
    setError(null);
    setPages("");
    const valid = Array.from(newFiles).find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!valid) {
      setError("Please select a valid PDF file.");
      return;
    }
    setFile(valid);
  };

  const handleExtract = async () => {
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }
    if (!pages.trim()) {
      setError("Please enter the pages to extract (e.g., '1, 3, 5-10').");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pages", pages);

      const res = await fetch(`${API_URL}/api/tools/extract`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to extract pages");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Omni_Extracted_${file.name}`;
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
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-6 sm:px-12 fixed top-0 w-full z-50">
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
        
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-50 pl-1 pr-4 py-1 border border-orange-100">
          <span className="bg-orange-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full"><Scissors className="w-3 h-3 inline-block mr-1"/>Utility Tool</span>
          <span className="text-sm font-medium text-orange-700">Extract Pages</span>
        </div>

        <div className="text-center mb-10 w-full">
          <div className="max-w-[1200px] mx-auto mb-4 w-full">
            <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
              <span className="whitespace-nowrap block">Extract PDF</span>
              <span className="text-orange-500 italic pr-2">pages</span> 
              <span className="relative z-10 inline-block">
                instantly.
                <span className="absolute bottom-1 left-0 w-full h-[28px] bg-amber-300/60 -z-10 rounded-sm transform -rotate-1"></span>
              </span>
            </h1>
          </div>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#6B7280] leading-relaxed">
            Pull specific pages or page ranges from a large PDF document to create a new one. 100% Private.
          </p>
        </div>
        
        <div className="w-full max-w-2xl">
          
          <div
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !file && fileRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed px-8 py-10 text-center transition-all duration-300 shadow-sm ${
              dragOver ? "border-orange-500 bg-orange-50/80 scale-[1.02]" : "border-slate-300 bg-white hover:border-orange-400 hover:bg-slate-50"
            } ${!file ? "cursor-pointer py-16" : ""}`}
          >
            {!file ? (
              <>
                <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300 ${
                  dragOver ? "bg-orange-600 text-white shadow-lg shadow-orange-200" : "bg-orange-100 text-orange-600 group-hover:bg-orange-200"
                }`}>
                  <FileOutput className="w-8 h-8" />
                </div>
                <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop your PDF</p>
                <p className="text-sm text-slate-500 mb-6">or click to browse from your computer</p>
              </>
            ) : (
              <div className="text-left w-full flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">File Ready</h3>
                  <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                    Change File
                  </button>
                </div>
                
                <div className="relative rounded-xl">
                  {loading && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl border border-orange-100 shadow-inner"
                    >
                      <div className="relative flex items-center justify-center mb-4 mt-2">
                        <div className="absolute w-12 h-12 border-4 border-orange-200 rounded-full"></div>
                        <div className="absolute w-12 h-12 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                        <Scissors className="w-5 h-5 text-orange-600 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Extracting Pages...</p>
                      <p className="text-xs text-slate-500 font-medium mt-1 mb-2">Processing document securely</p>
                    </motion.div>
                  )}
                  
                  <AnimatePresence>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      className={`flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm transition-colors ${loading ? "opacity-40 grayscale" : "hover:border-orange-300"}`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
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

                <div className="mt-2 flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700">Pages to Extract</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={pages}
                            onChange={(e) => setPages(e.target.value)}
                            placeholder="e.g. 1-5, 8, 11-13" 
                            className="block w-full px-4 py-3 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-all"
                        />
                    </div>
                    <p className="text-xs font-medium text-slate-500">Separate page numbers and ranges by commas.</p>
                </div>

                {error && <p className="mt-2 text-sm font-semibold text-red-500 bg-red-50 py-2 px-3 rounded-lg border border-red-100">{error}</p>}
                
                <div className="mt-2 pt-4 border-t border-slate-200 flex justify-end">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleExtract(); }}
                    disabled={loading || !pages.trim()}
                    className="bg-[#111827] text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-black transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> Extracting...</>
                    ) : (
                      <><Scissors className="w-4 h-4"/> Extract Pages</>
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
