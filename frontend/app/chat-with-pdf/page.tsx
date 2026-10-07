"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCard } from "@/components/hero-upload";
import { Workbench } from "@/components/workbench";
import type { DocInfo } from "@/lib/api";
import Link from "next/link";
import { ChevronLeft, Brain, Zap } from "lucide-react";

export default function ChatWithPdfTool() {
  const [docs, setDocs] = useState<DocInfo[] | null>(null);

  return (
    <main className="relative min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Tool Header */}
      {!docs && (
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
      )}

      <AnimatePresence mode="wait">
        {docs === null ? (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97, filter: "blur(8px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pt-32 pb-20 px-6 flex flex-col items-center justify-center min-h-[90vh]"
          >
            <div className="text-center mb-10 w-full">
              <div className="max-w-[1200px] mx-auto mb-6 w-full">
                <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
                  <span className="whitespace-nowrap block">Chat with your</span>
                  <span className="text-[#6366F1] italic pr-2">massive</span> 
                  <span className="relative z-10 inline-block">
                    documents.
                    <span className="absolute bottom-1 left-0 w-full h-[28px] bg-[#FDE047]/60 -z-10 rounded-sm transform -rotate-1"></span>
                  </span>
                </h1>
              </div>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#6B7280] leading-relaxed">
                Drop research papers, manuals, or books up to 10,000 pages. 
                Omni reads it instantly and answers any question with pinpoint citations.
              </p>
            </div>
            
            <div className="w-full max-w-2xl">
              <UploadCard onReady={setDocs} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="workbench"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-screen"
          >
            <Workbench docs={docs} onReset={() => setDocs(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

