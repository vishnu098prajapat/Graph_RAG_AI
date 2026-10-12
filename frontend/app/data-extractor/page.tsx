"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Zap, FileText, Database, Download, CheckCircle2, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { API_URL } from "@/lib/api";

export default function DataExtractorTool() {
  const [file, setFile] = useState<File | null>(null);
  
  // Status states
  const [loadingFile, setLoadingFile] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processTime, setProcessTime] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Columns state
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (newFiles: FileList | File[]) => {
    setError(null);
    setProcessTime(null);
    setAvailableColumns([]);
    setSelectedColumns(new Set());
    
    const valid = Array.from(newFiles).find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!valid) {
      setError("Please select a valid PDF file.");
      return;
    }
    
    setFile(valid);
    setLoadingFile(true);
    
    // Fetch columns from backend
    try {
      const formData = new FormData();
      formData.append("file", valid);

      const res = await fetch(`${API_URL}/api/tools/get-pdf-columns`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to analyze PDF columns");
      }

      const data = await res.json();
      if (data.columns && data.columns.length > 0) {
        setAvailableColumns(data.columns);
        setSelectedColumns(new Set(data.columns)); // Default select all
      } else {
        throw new Error("No table columns found in this PDF.");
      }
    } catch (err: any) {
      setError(err.message);
      setFile(null); // Reset if analysis fails
    } finally {
      setLoadingFile(false);
    }
  };

  const toggleColumn = (col: string) => {
    const newSet = new Set(selectedColumns);
    if (newSet.has(col)) {
      newSet.delete(col);
    } else {
      newSet.add(col);
    }
    setSelectedColumns(newSet);
  };

  const handleExtract = async () => {
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    if (selectedColumns.size === 0) {
      setError("Please select at least one column to extract.");
      return;
    }

    setExtracting(true);
    setError(null);
    setProcessTime(null);
    
    const startTime = performance.now();

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Send selected columns as a JSON array string
      formData.append("selected_columns", JSON.stringify(Array.from(selectedColumns)));

      const res = await fetch(`${API_URL}/api/tools/extract-selected-columns`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to extract data");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Omni_CustomData_${file.name.replace('.pdf', '')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      const endTime = performance.now();
      setProcessTime(((endTime - startTime) / 1000).toFixed(2));
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <main className="relative min-h-screen bg-[#FAF8F5]" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Tool Header */}
      <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center px-4 sm:px-12 fixed top-0 w-full z-50">
        <Link href="/" className="flex items-center gap-2 cursor-pointer mr-6 sm:mr-8">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-600 shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">Omni</span>
        </Link>
        <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
        <Link href="/#tools" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors ml-1 sm:ml-2">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back to Tools</span>
        </Link>
      </header>

      <div className="pt-32 pb-20 px-4 sm:px-6 flex flex-col items-center justify-center min-h-[90vh]">
        
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 pl-1 pr-4 py-1 border border-emerald-100">
          <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full"><Database className="w-3 h-3 inline-block mr-1"/>Pro Growth Tool</span>
          <span className="text-sm font-medium text-emerald-700">Custom Column Extractor</span>
        </div>

        <div className="text-center mb-10 w-full">
          <div className="max-w-[1200px] mx-auto mb-4 w-full">
            <h1 className="text-[1.75rem] sm:text-5xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
              <span className="block">Select & Extract</span>
              <span className="text-emerald-500 italic pr-2">Columns</span> 
              <span className="relative z-10 inline-block">
                instantly.
                <span className="absolute bottom-1 left-0 w-full h-[28px] bg-emerald-200/40 -z-10 rounded-sm transform -rotate-1"></span>
              </span>
            </h1>
          </div>
          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-[#6B7280] leading-relaxed px-2">
            Upload any PDF with tables. We will automatically detect the column names and let you extract only the data you need into a clean CSV.
          </p>
        </div>
        
        <div className="w-full max-w-3xl">
          
          <div
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !file && !loadingFile && fileRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed px-4 sm:px-8 py-10 text-center transition-all duration-300 shadow-sm ${
              dragOver ? "border-emerald-500 bg-emerald-50/80 scale-[1.02]" : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50"
            } ${!file ? "cursor-pointer py-14 sm:py-16" : ""}`}
          >
            {loadingFile ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-16 h-16 border-4 border-emerald-200 rounded-full"></div>
                  <div className="absolute w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                  <Search className="w-6 h-6 text-emerald-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Analyzing PDF...</h3>
                <p className="text-slate-500 mt-2">Finding table columns in your document</p>
              </div>
            ) : !file ? (
              <>
                <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300 ${
                  dragOver ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200"
                }`}>
                  <Database className="w-8 h-8" />
                </div>
                <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop a PDF report</p>
                <p className="text-sm text-slate-500 mb-6">or click to browse from your computer</p>
              </>
            ) : (
              <div className="text-left w-full flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">File Ready</h3>
                  <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    Change File
                  </button>
                </div>
                
                <div className="relative rounded-xl">
                  {extracting && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl border border-emerald-100 shadow-inner"
                    >
                      <div className="relative flex items-center justify-center mb-4 mt-2">
                        <div className="absolute w-12 h-12 border-4 border-emerald-200 rounded-full"></div>
                        <div className="absolute w-12 h-12 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                        <Database className="w-5 h-5 text-emerald-600 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Extracting Columns...</p>
                      <p className="text-xs text-slate-500 font-medium mt-1 mb-2">Generating CSV from selected columns</p>
                    </motion.div>
                  )}
                  
                  <AnimatePresence>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      className={`flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm transition-colors ${extracting ? "opacity-40 grayscale" : "hover:border-emerald-300"}`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
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

                {/* Dynamic Columns Checkboxes */}
                {availableColumns.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 mt-1 text-left shadow-sm flex flex-col max-h-[350px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                      <h4 className="font-semibold text-slate-800 text-sm">Select Data to Extract:</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{selectedColumns.size} of {availableColumns.length} selected</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedColumns(new Set(availableColumns)); }}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md transition-colors"
                          >
                            Select All
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedColumns(new Set()); }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Scrollable container for mobile-friendly view */}
                    <div className="overflow-y-auto overflow-x-hidden flex flex-wrap gap-2.5 pb-2 custom-scrollbar pr-2">
                      {availableColumns.map((col, idx) => (
                        <button 
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); toggleColumn(col); }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 ${
                            selectedColumns.has(col) 
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200/50' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${selectedColumns.has(col) ? 'bg-white text-emerald-500' : 'bg-slate-100 text-slate-300 border border-slate-200'}`}>
                            {selectedColumns.has(col) && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-sm font-medium select-none truncate max-w-[200px]" title={col}>{col}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && <p className="mt-2 text-sm font-semibold text-red-600 bg-red-50 py-2 px-3 rounded-lg border border-red-100">{error}</p>}
                
                <div className="mt-2 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="w-full sm:w-auto">
                    {processTime && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm"
                      >
                        <Zap className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                        <span className="text-sm font-bold">Extracted in {processTime}s</span>
                      </motion.div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleExtract(); }}
                    disabled={extracting || selectedColumns.size === 0}
                    className="w-full sm:w-auto bg-slate-900 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-black transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {extracting ? (
                      <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> Extracting...</>
                    ) : (
                      <><Download className="w-4 h-4"/> Extract Selected Columns</>
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
