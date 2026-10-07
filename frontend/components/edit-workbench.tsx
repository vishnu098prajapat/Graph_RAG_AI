"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Zap, Download, Palette, Type, Settings2 } from "lucide-react";

export interface EditWorkbenchProps {
  filename: string;
  extractedPages: { page: number; text: string }[];
  onReset: () => void;
}

export function EditWorkbench({ filename, extractedPages, onReset }: EditWorkbenchProps) {
  const [pagesState, setPagesState] = useState(extractedPages);
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [textColor, setTextColor] = useState("#0E0E0E");
  const [fontFamily, setFontFamily] = useState("serif");
  const [fontSize, setFontSize] = useState("14");
  const [isExporting, setIsExporting] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    
    try {
      // Safe client-side require
      const html2pdf = require("html2pdf.js");
      const opt = {
        margin:       [0, 0, 0, 0],
        filename:     `Omni_Edited_${filename}`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, windowWidth: 800 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Ensure no outlines or weird scroll artifacts during export
      const oldOutline = previewRef.current.style.outline;
      previewRef.current.style.outline = 'none';
      await html2pdf().set(opt).from(previewRef.current).save();
      previewRef.current.style.outline = oldOutline;
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAF8F5] font-sans">
      
      {/* Global Omni Header */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-6 sm:px-10 shrink-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center gap-2 cursor-pointer mr-6">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-[#6366F1] shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 hidden sm:block">Omni</span>
        </Link>
        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block"></div>
        <button onClick={onReset} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors ml-4 mr-auto">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back to Tools</span>
        </button>

        <button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-teal-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-teal-700 transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50 ml-auto"
        >
            {isExporting ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Download className="w-4 h-4" />}
            Export as PDF
        </button>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: Live Editable A4 Canvas Viewer (Like a real PDF viewer) */}
          <div className="flex-1 overflow-y-auto bg-[#E5E7EB] py-10 flex flex-col items-center gap-8 relative">
              <div ref={previewRef} className="flex flex-col gap-8 w-[210mm]">
                  {pagesState.map((p, idx) => (
                      <div 
                          key={idx}
                          contentEditable
                          suppressContentEditableWarning
                          className="shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-teal-500/40 print:shadow-none"
                          style={{
                              width: "210mm",
                              minHeight: "297mm",
                              backgroundColor: bgColor,
                              padding: "25.4mm", // 1 inch standard margins
                              color: textColor,
                              fontFamily: fontFamily,
                              fontSize: `${fontSize}px`,
                              whiteSpace: "pre-wrap",
                              lineHeight: "1.6",
                              textAlign: "justify",
                              wordWrap: "break-word",
                              outline: "none"
                          }}
                      >
                          {p.text}
                      </div>
                  ))}
              </div>
          </div>

          {/* RIGHT: Document Settings Panel */}
          <div className="w-[320px] shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 overflow-y-auto">
            <div className="p-5 border-b border-slate-100 bg-teal-50/30 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-teal-600" />
                <h2 className="font-bold text-slate-800 text-sm">Document Settings</h2>
            </div>

            <div className="p-5 space-y-6">
                
                {/* Visual Settings */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Palette className="w-3 h-3"/> Canvas Colors</h3>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-600">Page Background</label>
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded border border-slate-300 cursor-pointer bg-white" />
                            <span className="text-xs text-slate-700 font-mono uppercase font-bold">{bgColor}</span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-600">Text Color</label>
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-10 h-10 rounded border border-slate-300 cursor-pointer bg-white" />
                            <span className="text-xs text-slate-700 font-mono uppercase font-bold">{textColor}</span>
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Typography Settings */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Type className="w-3 h-3"/> Typography</h3>
                    
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-600">Font Style</label>
                        <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="text-sm p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-slate-50 font-medium">
                            <option value="serif">Serif (Formal Document)</option>
                            <option value="sans-serif">Sans-Serif (Modern Clean)</option>
                            <option value="monospace">Monospace (Code/Technical)</option>
                            <option value="Georgia, serif">Georgia (Premium)</option>
                            <option value="Arial, sans-serif">Arial (Standard)</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-600">Font Size</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="range" 
                                min="8" max="32" step="1" 
                                value={fontSize} 
                                onChange={(e) => setFontSize(e.target.value)} 
                                className="flex-1 accent-teal-600 cursor-pointer" 
                            />
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded w-10 text-center">{fontSize}px</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <h4 className="text-xs font-bold text-amber-800 mb-1">Editor Instructions</h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                        The pages on the left act exactly like a PDF viewer. Click on any page to start editing its content directly!
                    </p>
                </div>

            </div>
          </div>

      </div>
    </div>
  );
}
