"use client";

import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { ChevronLeft, Zap, Type, UploadCloud } from "lucide-react";
import { UploadCard } from "@/components/hero-upload";
import { EditWorkbench } from "@/components/edit-workbench";
import { API_URL } from "@/lib/api";

export default function EditPdfTool() {
  const [extractedData, setExtractedData] = useState<{ filename: string, pages: {page: number, text: string}[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/tools/extract-text`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to extract text from PDF.");
      }

      const data = await res.json();
      
      setExtractedData({
        filename: data.filename,
        pages: data.pages
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (extractedData) {
    return (
      <EditWorkbench 
        filename={extractedData.filename} 
        extractedPages={extractedData.pages} 
        onReset={() => setExtractedData(null)} 
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] relative overflow-hidden flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Head>
        <title>Edit PDF | Omni</title>
      </Head>

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

      <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-teal-50/50 to-transparent -z-10 pointer-events-none"></div>

      <div className="flex-1 flex items-center justify-center pt-32 pb-20 px-4 sm:px-6">
        <div className="w-full max-w-[1200px] flex flex-col items-center">
          
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-teal-50 pl-1 pr-4 py-1 border border-teal-100">
            <span className="bg-teal-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full"><Type className="w-3 h-3 inline-block mr-1"/>Pro Tool</span>
            <span className="text-sm font-medium text-teal-700">Document Editor</span>
          </div>

          <div className="text-center mb-10 w-full">
            <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
              <span className="whitespace-nowrap block">Edit & reformat</span>
              <span className="text-teal-500 italic pr-2">PDF text</span> 
              <span className="relative z-10 inline-block">
                instantly.
                <span className="absolute bottom-1 left-0 w-full h-[28px] bg-amber-300/60 -z-10 rounded-sm transform -rotate-1"></span>
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#6B7280] leading-relaxed mt-4">
              Extract every single word perfectly, change page colors, modify fonts, and re-export as a pristine PDF document.
            </p>
          </div>
          
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 text-red-600 rounded-xl border border-red-100 font-semibold text-sm">
              {error}
            </div>
          )}

          {loading ? (
             <div className="w-full max-w-2xl bg-white p-12 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-16 h-16 border-4 border-teal-100 rounded-full"></div>
                  <div className="absolute w-16 h-16 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                  <Type className="w-6 h-6 text-teal-600 animate-pulse" />
                </div>
                <h3 className="font-bold text-slate-800 text-xl mb-2">Extracting all data...</h3>
                <p className="text-sm text-slate-500 font-medium">Reading every word from the document securely.</p>
             </div>
          ) : (
            <UploadCard 
              onReady={(docs) => {}} // We override the file drop manually below 
            />
          )}

          {/* Quick invisible dropzone overlay on UploadCard since we want custom parsing here */}
          {!loading && (
            <div className="absolute inset-x-0 bottom-10 h-64 opacity-0 z-20">
               <input 
                  type="file" 
                  accept=".pdf"
                  className="w-full h-full cursor-pointer"
                  onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                          handleUpload(Array.from(e.target.files));
                      }
                  }}
               />
            </div>
          )}
          
        </div>
      </div>
    </main>
  );
}
