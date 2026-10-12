"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Zap, Upload, FileText, ShieldAlert, EyeOff, Check, Eye, FileDown, CheckCircle2, ShieldCheck, Columns, Edit3 } from "lucide-react";
import { API_URL } from "@/lib/api";

type AnalysisResult = {
  emails: string[];
  phones: string[];
  aadhar: string[];
  credit_cards: string[];
  columns: string[];
};

export default function RedactTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "analyzing" | "review" | "redacting">("upload");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [foundData, setFoundData] = useState<AnalysisResult | null>(null);
  
  // Category Selection State
  const [selectEmails, setSelectEmails] = useState(true);
  const [selectPhones, setSelectPhones] = useState(true);
  const [selectAadhar, setSelectAadhar] = useState(true);
  const [selectCC, setSelectCC] = useState(true);

  // For Columns, user manually selects which ones
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());

  const [customWords, setCustomWords] = useState("");
  const [redactedPdfUrl, setRedactedPdfUrl] = useState<string | null>(null);

  const handleFileChange = async (newFiles: FileList | File[]) => {
    setError(null);
    const valid = Array.from(newFiles).find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    
    if (!valid) {
      setError("Please select a valid PDF file.");
      return;
    }
    
    setFile(valid);
    setPdfUrl(URL.createObjectURL(valid));
    setRedactedPdfUrl(null);
    analyzeFile(valid);
  };

  const analyzeFile = async (selectedFile: File) => {
    setStep("analyzing");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const res = await fetch(`${API_URL}/api/tools/analyze-sensitive-data`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to analyze document");
      }

      const data: AnalysisResult = await res.json();
      setFoundData(data);
      
      // Auto-select standard categories
      setSelectEmails(data.emails?.length > 0);
      setSelectPhones(data.phones?.length > 0);
      setSelectAadhar(data.aadhar?.length > 0);
      setSelectCC(data.credit_cards?.length > 0);
      
      // Don't auto-select columns, let user choose
      setSelectedColumns(new Set());
      
      setStep("review");
    } catch (err: any) {
      setError(err.message === "Failed to fetch" ? "Server offline." : err.message);
      setStep("upload");
    }
  };

  const toggleColumn = (col: string) => {
    const newSet = new Set(selectedColumns);
    if (newSet.has(col)) newSet.delete(col);
    else newSet.add(col);
    setSelectedColumns(newSet);
  };

  const handleRedact = async () => {
    if (!file || !foundData) return;
    
    // Combine selected items from categories and custom words
    const finalItemsToRedact: string[] = [];
    
    if (selectEmails) finalItemsToRedact.push(...(foundData.emails || []));
    if (selectPhones) finalItemsToRedact.push(...(foundData.phones || []));
    if (selectAadhar) finalItemsToRedact.push(...(foundData.aadhar || []));
    if (selectCC) finalItemsToRedact.push(...(foundData.credit_cards || []));
    
    const customList = customWords.split(",").map(w => w.trim()).filter(w => w);
    customList.forEach(w => finalItemsToRedact.push(w));

    const columnsToRedact = Array.from(selectedColumns);
    
    if (finalItemsToRedact.length === 0 && columnsToRedact.length === 0) {
        setError("Please select at least one category, column, or enter custom words.");
        return;
    }
    
    setStep("redacting");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("items", JSON.stringify(finalItemsToRedact));
      formData.append("columns", JSON.stringify(columnsToRedact));

      const res = await fetch(`${API_URL}/api/tools/redact-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to redact PDF.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setRedactedPdfUrl(url);
      setStep("review"); // STAY IN REVIEW!
      
    } catch (err: any) {
      setError(err.message);
      setStep("review");
    }
  };

  const handleDownload = () => {
    if (!redactedPdfUrl || !file) return;
    const a = document.createElement("a");
    a.href = redactedPdfUrl;
    a.download = `Redacted_${file.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

      <div className="pt-24 pb-12 px-4 sm:px-6 flex flex-col items-center justify-center min-h-[90vh]">
        
        {step === "upload" && (
            <div className="w-full flex-1 flex flex-col justify-center items-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 pl-1 pr-4 py-1 border border-emerald-100">
                  <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">High-Security</span>
                  <span className="text-sm font-medium text-emerald-700">100% Offline Permanent Redaction</span>
                </div>

                <div className="text-center mb-10 w-full">
                  <h1 className="text-[1.75rem] sm:text-5xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
                    <span className="block">Blackout sensitive</span>
                    <span className="text-emerald-500 italic pr-4">data from PDFs</span> 
                    <span className="relative z-10 inline-block text-[#111827]">
                      securely.
                      <span className="absolute bottom-2 left-0 w-full h-[20px] bg-emerald-200/40 -z-10 rounded-sm transform -rotate-1"></span>
                    </span>
                  </h1>
                  <p className="max-w-2xl mx-auto mt-6 text-lg md:text-xl text-slate-500 leading-relaxed">
                    Upload your confidential document. Our offline AI scans for Aadhar, Phones, Emails & Columns, allowing you to selectively redact exactly what you want before downloading.
                  </p>
                </div>
                
                <div className="w-full max-w-2xl">
                  <div
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    className={`relative rounded-3xl border-2 border-dashed px-4 sm:px-8 py-14 sm:py-16 text-center transition-all duration-300 shadow-sm cursor-pointer ${
                      dragOver ? "border-emerald-500 bg-emerald-50/80 scale-[1.02]" : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50"
                    }`}
                    onClick={() => fileRef.current?.click()}
                  >
                        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300 ${
                          dragOver ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-emerald-100 text-emerald-600"
                        }`}>
                          <Upload className="w-8 h-8" />
                        </div>
                        <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop a PDF to Redact</p>
                        <p className="text-sm text-slate-500">or click to browse from your computer</p>
                  </div>
                  {error && (
                    <div className="mt-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <p className="font-medium">{error}</p>
                    </div>
                  )}
                </div>
            </div>
        )}

        {step !== "upload" && (
            <div className="w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 mt-4">
                
                {/* LEFT: PDF PREVIEW */}
                <div className="flex-1 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col relative h-[80vh] min-h-[600px]">
                    <div className="h-14 border-b border-slate-100 bg-slate-50/50 flex items-center px-6 justify-between">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                            <Eye className="w-4 h-4 text-slate-500"/> 
                            {redactedPdfUrl ? "Preview: Redacted PDF" : "Preview: Original Document"}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                <ShieldCheck className="w-3.5 h-3.5"/>
                                100% Secure & Offline
                            </div>
                            {redactedPdfUrl && (
                               <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                   <ShieldAlert className="w-3.5 h-3.5"/> Blacked Out
                               </span> 
                            )}
                        </div>
                    </div>
                    {pdfUrl ? (
                        <iframe src={`${redactedPdfUrl ? redactedPdfUrl : pdfUrl}#toolbar=0`} className="w-full h-full border-none bg-slate-100" />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">Loading Preview...</div>
                    )}
                </div>

                {/* RIGHT: CONTROLS */}
                <div className="w-full lg:w-[480px] bg-white border border-slate-200 rounded-3xl flex flex-col h-[80vh] min-h-[600px] shadow-sm overflow-hidden">
                    
                    {step === "analyzing" && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                            <div className="relative flex items-center justify-center mb-6">
                              <div className="absolute w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                              <div className="absolute w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                              <ShieldAlert className="w-6 h-6 text-emerald-500 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Scanning Document...</h3>
                            <p className="text-slate-500 mt-2 text-sm">Detecting Tables, Aadhar, Phones & Emails.</p>
                        </div>
                    )}

                    {step === "redacting" && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                            <div className="relative flex items-center justify-center mb-6">
                              <div className="absolute w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                              <div className="absolute w-16 h-16 border-4 border-slate-800 rounded-full border-t-transparent animate-spin"></div>
                              <EyeOff className="w-6 h-6 text-slate-800 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Applying Redactions...</h3>
                            <p className="text-slate-500 mt-2 text-sm">Permanently blacking out selected Data.</p>
                        </div>
                    )}

                    {step === "review" && foundData && (
                        <div className="flex flex-col h-full relative">
                            
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="font-bold text-slate-800">File Ready</h3>
                                  <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                    Change File
                                  </button>
                                </div>
                                <div className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="font-semibold text-slate-700 truncate">{file?.name}</span>
                                    <span className="text-xs text-slate-400 font-medium">{file ? formatSize(file.size) : ""}</span>
                                  </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-white pb-32 custom-scrollbar">
                                
                                {/* AUTO-DETECTED TEXT */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-slate-800">Auto-Detected Data:</h4>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2.5">
                                        {foundData.emails?.length > 0 && (
                                            <button
                                              onClick={() => { setSelectEmails(!selectEmails); setRedactedPdfUrl(null); }}
                                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border shadow-sm ${
                                                selectEmails 
                                                  ? "bg-slate-900 border-[#111827] text-white" 
                                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                              }`}
                                            >
                                              {selectEmails && <CheckCircle2 className="w-4 h-4" />}
                                              Emails ({foundData.emails.length})
                                            </button>
                                        )}
                                        {foundData.phones?.length > 0 && (
                                            <button
                                              onClick={() => { setSelectPhones(!selectPhones); setRedactedPdfUrl(null); }}
                                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border shadow-sm ${
                                                selectPhones 
                                                  ? "bg-slate-900 border-[#111827] text-white" 
                                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                              }`}
                                            >
                                              {selectPhones && <CheckCircle2 className="w-4 h-4" />}
                                              Phone Numbers ({foundData.phones.length})
                                            </button>
                                        )}
                                        {foundData.aadhar?.length > 0 && (
                                            <button
                                              onClick={() => { setSelectAadhar(!selectAadhar); setRedactedPdfUrl(null); }}
                                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border shadow-sm ${
                                                selectAadhar 
                                                  ? "bg-slate-900 border-[#111827] text-white" 
                                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                              }`}
                                            >
                                              {selectAadhar && <CheckCircle2 className="w-4 h-4" />}
                                              Aadhar Cards ({foundData.aadhar.length})
                                            </button>
                                        )}
                                        {foundData.credit_cards?.length > 0 && (
                                            <button
                                              onClick={() => { setSelectCC(!selectCC); setRedactedPdfUrl(null); }}
                                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border shadow-sm ${
                                                selectCC 
                                                  ? "bg-slate-900 border-[#111827] text-white" 
                                                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                              }`}
                                            >
                                              {selectCC && <CheckCircle2 className="w-4 h-4" />}
                                              Credit Cards ({foundData.credit_cards.length})
                                            </button>
                                        )}

                                        {(!foundData.aadhar?.length && !foundData.emails?.length && !foundData.phones?.length && !foundData.credit_cards?.length) && (
                                            <div className="w-full text-slate-400 text-sm italic py-2">
                                                No specific PII strings detected.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px w-full bg-slate-100"></div>

                                {/* TABLE COLUMNS */}
                                {foundData.columns?.length > 0 && (
                                    <>
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                    <Columns className="w-4 h-4 text-emerald-600"/>
                                                    Table Columns Detected:
                                                </h4>
                                                <span className="text-xs bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded">Pro Feature</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-3">Select a column to completely blackout all its rows.</p>
                                            
                                            <div className="flex flex-wrap gap-2.5">
                                                {foundData.columns.map((col, idx) => {
                                                    const isSelected = selectedColumns.has(col);
                                                    return (
                                                        <button
                                                          key={`col-${idx}`}
                                                          onClick={() => { toggleColumn(col); setRedactedPdfUrl(null); }}
                                                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border shadow-sm ${
                                                            isSelected 
                                                              ? "bg-emerald-600 border-emerald-600 text-white" 
                                                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                          }`}
                                                        >
                                                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                                          {col}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="h-px w-full bg-slate-100"></div>
                                    </>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Edit3 className="w-4 h-4 text-emerald-600"/>
                                            Manual Redaction
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">
                                        Manually hide any text. Just select & copy text from the PDF on the left, and paste it here (comma separated).
                                    </p>
                                    <textarea 
                                        placeholder="Paste names, addresses, or exact words here to permanently blackout..." 
                                        value={customWords}
                                        onChange={(e) => { setCustomWords(e.target.value); setRedactedPdfUrl(null); }}
                                        className="w-full bg-emerald-50/50 border border-emerald-100 text-slate-800 placeholder-slate-400 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none h-28 shadow-inner"
                                    />
                                </div>
                            </div>
                            
                            {/* ACTION FOOTER */}
                            <div className="absolute bottom-0 left-0 w-full p-6 border-t border-slate-100 bg-white/90 backdrop-blur-md rounded-b-3xl">
                                {error && (
                                    <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4" /> {error}
                                    </div>
                                )}
                                
                                <button 
                                    onClick={handleRedact}
                                    className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-95 ${
                                        redactedPdfUrl 
                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                        : "bg-slate-900 hover:bg-slate-800 text-white"
                                    }`}
                                >
                                    <EyeOff className="w-5 h-5" />
                                    {redactedPdfUrl ? "Update Preview" : "Preview Redaction"}
                                </button>
                                
                                {redactedPdfUrl && (
                                    <button 
                                        onClick={handleDownload}
                                        className="w-full mt-3 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 transition-transform active:scale-95 animate-in fade-in slide-in-from-bottom-2"
                                    >
                                        <FileDown className="w-5 h-5" />
                                        Download Final PDF
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </main>
  );
}
