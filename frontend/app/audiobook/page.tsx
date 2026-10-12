"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Headphones, Zap, Play, Pause, Square, SkipBack, SkipForward, FileText, Settings, Volume2, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { API_URL } from "@/lib/api";

export default function AudiobookTool() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Audio Player State
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Voice Settings State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState<number>(0.9);
  const [pitch, setPitch] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Ref to keep track of if we are actively playing (to prevent onend loop)
  const isPlayingRef = useRef(false);

  // Initialize Voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        const defaultVoice = availableVoices.find(v => 
          v.name.includes('Female') || 
          v.name.includes('Google UK English Female') ||
          v.name.includes('Samantha') ||
          v.name.includes('Zira')
        ) || availableVoices[0];
        
        if (defaultVoice && !selectedVoice) {
          setSelectedVoice(defaultVoice.name);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleFileChange = async (newFiles: FileList | File[]) => {
    setError(null);
    setPages([]);
    setCurrentPage(0);
    setIsPlaying(false);
    isPlayingRef.current = false;
    window.speechSynthesis.cancel();
    
    const valid = Array.from(newFiles).find(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!valid) {
      setError("Please select a valid PDF file.");
      return;
    }
    
    setFile(valid);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", valid);

      const res = await fetch(`${API_URL}/api/tools/extract-text-paginated`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to extract text from PDF");
      }

      const data = await res.json();
      if (data.pages && data.pages.length > 0) {
        setPages(data.pages);
      } else {
        throw new Error("No readable text found in this PDF.");
      }
    } catch (err: any) {
      setError(err.message);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };


  // Download High-Quality MP3 for Current Page
  const downloadPageAudio = async () => {
    if (pages.length === 0) return;
    const text = pages[currentPage];
    if (!text || text.trim().length === 0) return;

    setIsDownloading(true);
    try {
      const formData = new FormData();
      formData.append("text", text);

      const res = await fetch(`${API_URL}/api/tools/download-page-audio`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to download audio");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Audiobook_Page_${currentPage + 1}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error(err);
      setError("Failed to download MP3. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Audio Playback Logic - Sentence by Sentence for human flow and bug prevention

  const playCurrentPage = () => {
    if (pages.length === 0) return;
    
    window.speechSynthesis.cancel(); 
    
    const text = pages[currentPage];
    if (!text || text.trim().length === 0) {
      if (currentPage < pages.length - 1) {
        setCurrentPage(c => c + 1);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
      return;
    }

    // Advanced sentence chunking for natural pauses
    // Splits by . ! ? while keeping the punctuation
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    let currentSentenceIndex = 0;

    const speakNextSentence = () => {
      if (!isPlayingRef.current) return;
      
      if (currentSentenceIndex >= sentences.length) {
        if (currentPage < pages.length - 1) {
          setCurrentPage(c => c + 1);
        } else {
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
        return;
      }
      
      const sentence = sentences[currentSentenceIndex].trim();
      if (!sentence) {
        currentSentenceIndex++;
        speakNextSentence();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentence);
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
      
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onend = () => {
        currentSentenceIndex++;
        speakNextSentence();
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        console.error("Speech Synthesis Error", e);
        setIsPlaying(false);
        isPlayingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextSentence();
  };

  // Effect to trigger play when page changes OR settings change while playing
  useEffect(() => {
    if (isPlaying) {
      isPlayingRef.current = true;
      playCurrentPage();
    } else {
      isPlayingRef.current = false;
      window.speechSynthesis.cancel();
    }
  }, [currentPage, isPlaying, rate, pitch, selectedVoice]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const stopAudio = () => {
    setIsPlaying(false);
    setCurrentPage(0);
    window.speechSynthesis.cancel();
  };

  const nextPg = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(c => c + 1);
    }
  };

  const prevPg = () => {
    if (currentPage > 0) {
      setCurrentPage(c => c - 1);
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
          <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full"><Headphones className="w-3 h-3 inline-block mr-1"/>Pro Audio Tool</span>
          <span className="text-sm font-medium text-emerald-700">PDF to Audiobook</span>
        </div>

        <div className="text-center mb-10 w-full">
          <div className="max-w-[1200px] mx-auto mb-4 w-full">
            <h1 className="text-[1.75rem] sm:text-5xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
              <span className="block">Listen to your</span>
              <span className="text-emerald-500 italic pr-2">PDFs</span> 
              <span className="relative z-10 inline-block">
                like podcasts.
                <span className="absolute bottom-1 left-0 w-full h-[28px] bg-emerald-200/40 -z-10 rounded-sm transform -rotate-1"></span>
              </span>
            </h1>
          </div>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#6B7280] leading-relaxed">
            Upload any textbook or report and let the smart voice engine read it aloud. 
            Page-by-page streaming guarantees zero crashes on 10,000-page files.
          </p>
        </div>
        
        <div className="w-full max-w-2xl">
          
          <div
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`relative rounded-3xl border-2 border-dashed px-4 sm:px-8 py-10 text-center transition-all duration-300 shadow-sm ${
              dragOver ? "border-emerald-500 bg-emerald-50/80 scale-[1.02]" : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-slate-50"
            } ${!file ? "cursor-pointer py-14 sm:py-16" : ""}`}
            onClick={() => !file && !loading && fileRef.current?.click()}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-16 h-16 border-4 border-emerald-200 rounded-full"></div>
                  <div className="absolute w-16 h-16 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                  <Headphones className="w-6 h-6 text-emerald-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Processing Audio...</h3>
                <p className="text-slate-500 mt-2">Extracting and optimizing text for speech engine</p>
              </div>
            ) : !file ? (
              <>
                <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300 ${
                  dragOver ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200"
                }`}>
                  <Headphones className="w-8 h-8" />
                </div>
                <p className="text-xl font-bold text-slate-800 mb-2">Drag & drop a PDF document</p>
                <p className="text-sm text-slate-500 mb-6">or click to browse from your computer</p>
              </>
            ) : (
              <div className="text-left w-full flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">Audiobook Ready</h3>
                  <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    Change File
                  </button>
                </div>
                
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700 truncate">{file.name}</span>
                      <span className="text-xs text-slate-400 font-medium">{formatSize(file.size)} • {pages.length} Pages</span>
                    </div>
                  </div>
                </div>

                {/* Spotify-style Audio Player */}
                {pages.length > 0 && (
                  <div className="bg-slate-900 rounded-2xl p-6 shadow-xl mt-2 border border-slate-800 relative overflow-hidden">
                    {/* Visualizer background effect */}
                    {isPlaying && (
                      <div className="absolute inset-0 opacity-10 flex items-center justify-around pointer-events-none">
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: ["20%", "80%", "20%"] }}
                            transition={{ duration: 1 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
                            className="w-4 bg-emerald-400 rounded-full"
                          />
                        ))}
                      </div>
                    )}
                    
                    <div className="relative z-10 flex flex-col items-center">
                      <p className="text-emerald-400 font-semibold text-xs tracking-widest uppercase mb-1">Now Reading</p>
                      <h4 className="text-white font-bold text-lg mb-6 truncate max-w-full text-center">
                        Page {currentPage + 1} of {pages.length}
                      </h4>
                      
                      {/* Playback Controls */}
                      <div className="flex items-center justify-center gap-6 mb-6">
                        <button onClick={prevPg} disabled={currentPage === 0} className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                          <SkipBack className="w-7 h-7 fill-current" />
                        </button>
                        
                        <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform active:scale-95">
                          {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                        </button>
                        
                        <button onClick={nextPg} disabled={currentPage === pages.length - 1} className="text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                          <SkipForward className="w-7 h-7 fill-current" />
                        </button>
                      </div>

                      <div className="w-full flex items-center justify-between text-slate-400 mt-2">
                        <button onClick={stopAudio} className="text-xs hover:text-white flex items-center gap-1 transition-colors">
                          <Square className="w-3.5 h-3.5" /> Stop
                        </button>
                        
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={downloadPageAudio} 
                            disabled={isDownloading}
                            className="text-xs font-semibold hover:text-white flex items-center gap-1.5 transition-colors bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg border border-emerald-500/30 disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <><span className="animate-spin w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full"></span> Saving...</>
                            ) : (
                              <><Download className="w-3.5 h-3.5" /> Download Page</>
                            )}
                          </button>

                          <button onClick={() => setShowSettings(!showSettings)} className="text-xs hover:text-white flex items-center gap-1 transition-colors">
                            <Settings className="w-3.5 h-3.5" /> Voice Settings
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Voice Settings Panel */}
                <AnimatePresence>
                  {showSettings && pages.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mt-1 overflow-hidden"
                    >
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Volume2 className="w-4 h-4"/> Audio Settings</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Select Voice (Auto-detects female)</label>
                          <select 
                            value={selectedVoice} 
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            {voices.map((v, i) => (
                              <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-2 flex justify-between">
                              <span>Reading Speed</span>
                              <span className="text-emerald-600 font-bold">{rate.toFixed(1)}x</span>
                            </label>
                            <input 
                              type="range" min="0.5" max="2" step="0.1" value={rate} 
                              onChange={(e) => setRate(parseFloat(e.target.value))}
                              className="w-full accent-violet-500"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-2 flex justify-between">
                              <span>Voice Pitch</span>
                              <span className="text-emerald-600 font-bold">{pitch.toFixed(1)}</span>
                            </label>
                            <input 
                              type="range" min="0" max="2" step="0.1" value={pitch} 
                              onChange={(e) => setPitch(parseFloat(e.target.value))}
                              className="w-full accent-violet-500"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && <p className="mt-2 text-sm font-semibold text-red-600 bg-red-50 py-2 px-3 rounded-lg border border-red-100">{error}</p>}
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
