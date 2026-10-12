"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { 
  ChevronLeft, Zap, Image as ImageIcon, 
  Trash2, Plus, Download, ShieldCheck, RefreshCw
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { API_URL } from "@/lib/api";

interface ImageFileItem {
  id: string;
  file: File;
  previewUrl: string;
}

export default function ImageConverterTool() {
  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [targetFormat, setTargetFormat] = useState<string>("png");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    setError(null);
    const validImages: ImageFileItem[] = [];

    Array.from(newFiles).forEach((f) => {
      const isImg = f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i.test(f.name);
      if (isImg) {
        validImages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          file: f,
          previewUrl: URL.createObjectURL(f),
        });
      } else {
        setError(`Security alert: '${f.name}' is not a valid image file.`);
      }
    });

    if (validImages.length > 0) {
      setImages((prev) => [...prev, ...validImages]);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setError(null);
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      setError("Please select at least one image.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      images.forEach((img) => {
        formData.append("files", img.file);
      });
      formData.append("target_format", targetFormat);

      const res = await fetch(`${API_URL}/api/tools/convert-images`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Failed to convert images.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // PDF target → backend always returns a single PDF (not zip), even for bulk images
      let outFileName: string;
      if (targetFormat === "pdf") {
        outFileName = "Omni_Converted_Images.pdf";
      } else if (images.length > 1) {
        outFileName = `Omni_Converted_Images_${targetFormat.toUpperCase()}.zip`;
      } else {
        const baseName = images[0].file.name.split('.')[0];
        outFileName = `Omni_${baseName}.${targetFormat}`;
      }

      a.download = outFileName;
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
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <main className="relative min-h-screen bg-[#FAF8F5]" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Top Header */}
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
        
        {/* Tool Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 pl-1 pr-4 py-1 border border-emerald-100">
          <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            <RefreshCw className="w-3 h-3 inline-block mr-1"/>Image Tool
          </span>
          <span className="text-sm font-medium text-emerald-700">Image Format Converter</span>
        </div>

        {/* Title */}
        <div className="text-center mb-10 w-full max-w-3xl">
          <h1 className="text-[1.75rem] sm:text-5xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
            Convert <span className="text-emerald-600 italic">image formats</span> 
            <span className="relative z-10 inline-block ml-3">
              instantly.
              <span className="absolute bottom-1 left-0 w-full h-[24px] bg-emerald-200/60 -z-10 rounded-sm transform -rotate-1"></span>
            </span>
          </h1>
          <p className="mt-4 text-lg text-[#6B7280]">
            Convert JPG, PNG, WebP, HEIC, GIF & BMP images in bulk with 100% loss-free original resolution.
          </p>
        </div>

        <div className="w-full max-w-3xl">
          
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 shadow-sm">
            
            {images.length === 0 ? (
              <div
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`py-10 sm:py-16 text-center rounded-2xl cursor-pointer transition-all ${
                  dragOver ? "bg-emerald-50 border-emerald-400 scale-[1.01]" : "hover:bg-slate-50"
                }`}
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <p className="text-xl font-bold text-slate-800 mb-1">Drag & drop your images here</p>
                <p className="text-sm text-slate-500 mb-4">Supports JPG, PNG, WebP, HEIC, GIF, BMP (Single or Bulk)</p>
                <button className="bg-emerald-600 text-white text-sm font-bold py-2.5 px-6 rounded-full shadow-sm hover:bg-emerald-700 transition-colors">
                  Select Images
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      Selected Images ({images.length})
                    </h3>
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      100% Lossless Quality Preserved
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => fileRef.current?.click()}
                      className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl border border-emerald-100 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add More
                    </button>
                    <button 
                      onClick={clearAll}
                      className="text-xs font-bold text-slate-400 hover:text-emerald-600 px-2 py-2 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[360px] overflow-y-auto p-1">
                  <AnimatePresence>
                    {images.map((imgItem) => (
                      <motion.div
                        key={imgItem.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-2 flex flex-col shadow-xs"
                      >
                        <div className="relative w-full h-28 rounded-xl overflow-hidden bg-slate-200 flex items-center justify-center">
                          <img 
                            src={imgItem.previewUrl} 
                            alt={imgItem.file.name}
                            className="w-full h-full object-cover" 
                          />
                          <button
                            onClick={() => removeImage(imgItem.id)}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-emerald-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="mt-2 px-1">
                          <p className="text-xs font-semibold text-slate-700 truncate" title={imgItem.file.name}>
                            {imgItem.file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {formatSize(imgItem.file.size)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">Convert To Format:</label>
                    <select
                      value={targetFormat}
                      onChange={(e) => setTargetFormat(e.target.value)}
                      className="text-xs font-bold bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="png">PNG Image (.png)</option>
                      <option value="jpg">JPG / JPEG (.jpg)</option>
                      <option value="webp">WebP Image (.webp)</option>
                      <option value="pdf">PDF Document (.pdf)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleConvert}
                    disabled={loading}
                    className="w-full sm:w-auto bg-slate-900 text-white font-bold text-sm py-3 px-8 rounded-full shadow-lg hover:bg-black transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> Converting...</>
                    ) : (
                      <><Download className="w-4 h-4" /> Convert & Download</>
                    )}
                  </button>

                </div>

              </div>
            )}

            {error && (
              <p className="mt-4 text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                {error}
              </p>
            )}

          </div>

          <input 
            ref={fileRef} 
            type="file" 
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic" 
            multiple 
            className="hidden" 
            onChange={(e) => e.target.files && handleFiles(e.target.files)} 
          />

        </div>
      </div>
    </main>
  );
}
