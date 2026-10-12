"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, FileSpreadsheet, Zap, Upload, FileText, Download, ShieldCheck, FileDown } from "lucide-react";
import { API_URL } from "@/lib/api";

export default function PDFToExcelTool() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (newFiles: FileList | File[]) => {
    setError(null);
    const valid = Array.from(newFiles).find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    
    if (!valid) {
      setError("Please select a valid PDF file.");
      return;
    }
    
    setFile(valid);
  };

  const handleConvert = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/tools/pdf-to-excel`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to convert PDF to Excel.");
      }

      // Download the Excel file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(".pdf", "")}_Data.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      setError(err.message === "Failed to fetch" ? "Server is offline. Please start the backend." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <main className="relative min-h-screen bg-[#FAF8F5]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <input 
        type="file" 
        className="hidden" 
        ref={fileRef} 
        accept="application/pdf" 
        onChange={(e) => e.target.files && handleFileChange(e.target.files)} 
      />

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
        
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 pl-1 pr-4 py-1 border border-emerald-100">
          <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full"><ShieldCheck className="w-3 h-3 inline-block mr-1"/>Privacy Safe</span>
          <span className="text-sm font-medium text-emerald-700">100% Offline Extraction</span>
        </div>

        <div className="text-center mb-10 w-full">
          <div className="max-w-[1200px] mx-auto mb-4 w-full">
            <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
              <span className="whitespace-nowrap block">Convert statements</span>
              <span className="text-emerald-500 italic pr-4">to Excel</span> 
              <span className="relative z-10 inline-block">
                100% securely.
                <span className="absolute bottom-1 left-0 w-full h-[28px] bg-emerald-200/40 -z-10 rounded-sm transform -rotate-1"></span>
              </span>
            </h1>
          </div>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#6B7280] leading-relaxed">
            Upload your PDF bank statements or invoices. Our local engine extracts all financial tables into a clean Excel sheet without uploading data to the cloud.
          </p>
        </div>
        
        <div className="w-full max-w-2xl">
          <div
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`relative rounded-3xl border-2 border-dashed px-8 py-10 text-center transition-all duration-300 shadow-sm ${
              dragOver ? "border-emerald-500 bg-emerald-50/80 scale-[1.02]" : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50"
            } ${!file ? "cursor-pointer py-16" : ""}`}
            onClick={() => !file && !loading && fileRef.current?.click()}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-16 h-16 border-4 border-emerald-200 rounded-full"></div>
                  <div className="absolute w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                  <FileSpreadsheet className="w-6 h-6 text-emerald-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Extracting Tables...</h3>
                <p className="text-slate-500 mt-2">Processing financial data locally</p>
              </div>
            ) : !file ? (
              <>
                <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300 ${
                  dragOver ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200"
                }`}>
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-xl font-bold text-slate-800 mb-2">
                  Drag & drop a Bank Statement
                </p>
                <p className="text-sm text-slate-500 mb-6">or click to browse from your computer</p>
              </>
            ) : (
              <div className="text-left w-full flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">Ready for Extraction</h3>
                  <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    Change File
                  </button>
                </div>
                
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm mb-6">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700 truncate">{file.name}</span>
                      <span className="text-xs text-slate-400 font-medium">{formatSize(file.size)}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); handleConvert(); }}
                  className="w-full py-4 bg-[#111827] hover:bg-slate-800 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-95"
                >
                  <FileDown className="w-6 h-6" />
                  Convert to Excel (.xlsx)
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <p className="font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
