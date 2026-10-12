import type { Metadata } from "next";
import Link from "next/link";
import { Star, Brain, Plus, XCircle, Image as ImageIcon, FileSpreadsheet, Database, Headphones, ShieldCheck, ScanText, FileType2, Zap } from "lucide-react";
import ScrollHeader from "@/components/scroll-header";

export const metadata: Metadata = {
  title: "Omni — Free PDF Tools. No Sign-up. No Limits.",
  description:
    "Free online PDF tools — merge, compress, OCR, chat with documents, convert to Word/Excel. Process PDFs up to 10,000 pages. 100% private, no sign-up required.",
  keywords: [
    "free pdf tools online",
    "pdf editor no sign up",
    "merge pdf free",
    "compress pdf online",
    "ocr pdf to text",
    "chat with pdf ai",
    "pdf to word converter free",
    "pdf tools no registration",
    "pdf converter online free",
    "pdf tools 10000 pages",
  ],
  alternates: { canonical: "https://omni-pdf.com" },
  openGraph: {
    title: "Omni — Free PDF Tools. No Sign-up. No Limits.",
    description:
      "Merge, compress, OCR, chat with documents, convert to Word/Excel. Process PDFs up to 10,000 pages. 100% private.",
    url: "https://omni-pdf.com",
  },
};

const homeSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Omni PDF Tools",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description:
    "Free online PDF tools — merge, compress, OCR, convert to Word/Excel, chat with AI. No sign-up, no file size limits.",
  url: "https://omni-pdf.com",
  featureList: [
    "Chat with PDF using AI",
    "Merge PDF files with no size limit",
    "Compress PDF",
    "OCR - PDF and Image to Text (Hindi + English)",
    "PDF to Word converter",
    "PDF to Excel converter",
    "Redact sensitive information",
    "Unlock PDF password",
    "Extract PDF pages",
    "Image to PDF converter",
    "Extract leads from PDF",
    "PDF to Audiobook",
  ],
};

const tools = [
  {
    id: "chat-with-pdf",
    icon: Brain,
    title: "Chat with Document",
    desc: "Interact with massive 10,000-page files instantly without limits. Perfect for researchers and students.",
    href: "/chat-with-pdf",
    badge: "Flagship",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "merge",
    icon: Plus,
    title: "Merge Heavy Files",
    desc: "Combine 500MB+ documents seamlessly. Zero file-size restrictions.",
    href: "/merge-pdf",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "redact",
    icon: ShieldCheck,
    title: "Auto-Censor / Redact",
    desc: "Permanently blackout sensitive information (Emails, Phones, Cards) from your PDFs securely offline.",
    href: "/redact",
    badge: "High Security",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "data-extractor",
    icon: Database,
    title: "Lead & Data Extractor",
    desc: "Mine Emails, Phone numbers, and Website Links from massive reports directly into a clean CSV.",
    href: "/data-extractor",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "audiobook",
    icon: Headphones,
    title: "PDF to Audiobook",
    desc: "Listen to your PDFs like podcasts. Features page-by-page streaming, adjustable voices, and speed controls.",
    href: "/audiobook",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "pdf-excel",
    icon: FileSpreadsheet,
    title: "Bank Statement to Excel",
    desc: "Securely convert PDF statements and invoices to Excel format. 100% offline, privacy-first processing.",
    href: "/pdf-to-excel",
    badge: "Popular",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "ocr",
    icon: ScanText,
    title: "OCR — PDF & Image to Text",
    desc: "Extract editable text from scanned PDFs & mobile photos (JPG, PNG) in English + Hindi with instant copy & download.",
    href: "/ocr",
    badge: "Hindi + English",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "compress",
    icon: Zap,
    title: "Compress Document",
    desc: "Reduce huge file sizes heavily without losing visual quality.",
    href: "/compress-pdf",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "unlock",
    icon: XCircle,
    title: "Unlock & Decrypt",
    desc: "Remove passwords from protected files in bulk securely.",
    href: "/unlock-pdf",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "image-converter",
    icon: ImageIcon,
    title: "Image Format Converter",
    desc: "Convert JPG, PNG, WebP, HEIC & GIF images in bulk with 100% loss-free quality.",
    href: "/image-to-pdf",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
  {
    id: "pdf-to-word",
    icon: FileType2,
    title: "PDF to Word",
    desc: "Convert any PDF into a fully editable .docx Word file. Layout preserved, text extracted — 100% offline.",
    href: "/pdf-to-word",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    hoverBgClass: "group-hover:bg-emerald-500",
    borderHoverClass: "hover:border-emerald-200",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FAF8F5]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
      />

      <ScrollHeader />

      {/* Hero Section */}
      <section className="relative pt-[140px] pb-12 px-4 sm:px-6 flex flex-col items-center justify-center text-center">

        {/* Badge */}
        <div className="mb-10 inline-flex items-center gap-2 rounded-full bg-[#F3F4F6] pl-1 pr-3 sm:pr-4 py-1 hover:bg-[#E5E7EB] transition-colors cursor-pointer">
          <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">New</span>
          <span className="text-xs sm:text-sm font-medium text-[#4B5563]">10,000 page limit unlocked for free &rarr;</span>
        </div>

        {/* Big Bold Headline */}
        <div className="max-w-[1200px] mx-auto mb-6 w-full">
          <h1 className="text-[1.75rem] sm:text-5xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
            <span className="block">The universal workspace.</span>
            <span className="text-emerald-600 italic pr-2">No limits.</span>
            <span className="relative z-10 inline-block">
              No sign-ups.
              <span className="absolute bottom-1 left-0 w-full h-[20px] sm:h-[28px] bg-[#FDE047]/60 -z-10 rounded-sm transform -rotate-1"></span>
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-[#6B7280] leading-relaxed mb-8 px-2">
          Omni reads, merges, and analyzes massive documents up to 10,000 pages.
          Everything runs directly on your machine with zero retention.
        </p>

        {/* Single CTA Button */}
        <div className="flex justify-center mb-8">
          <a
            href="#tools"
            className="text-base font-semibold text-white bg-slate-900 px-10 py-3.5 rounded-full hover:bg-black transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
          >
            Start for free
          </a>
        </div>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden`}
                style={{ zIndex: 10 - i }}
              >
                <img
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=e2e8f0`}
                  alt="Omni user"
                  width={32}
                  height={32}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col items-start text-left">
            <div className="flex gap-1 mb-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
              ))}
              <span className="text-xs font-bold text-[#374151] ml-1">4.9</span>
            </div>
            <span className="text-[11px] text-[#6B7280]">from 4,000+ teams who hate limits</span>
          </div>
        </div>
      </section>

      {/* Tools Grid Section */}
      <section id="tools" className="max-w-[1280px] mx-auto py-12 px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tools.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={`group relative bg-[#FAF8F5] p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 transition-all duration-200 cursor-pointer block overflow-hidden active:scale-95 md:hover:-translate-y-1 md:hover:shadow-xl ${t.borderHoverClass}`}
            >
              {t.badge && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm">
                  {t.badge}
                </div>
              )}
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-5 transition-colors ${t.bgClass} ${t.hoverBgClass}`}>
                <t.icon className={`w-6 h-6 transition-colors group-hover:text-white ${t.colorClass}`} />
              </div>
              <h3 className="text-lg font-bold text-[#111827] mb-2">{t.title}</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] py-8 mt-12">
        <p className="text-center text-sm text-[#9CA3AF]">© 2026 Omni. The universal workspace.</p>
      </footer>
    </main>
  );
}
