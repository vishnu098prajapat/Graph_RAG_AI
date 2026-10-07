import Link from "next/link";
import { Zap, Brain, Search, Plus, FileText, XCircle, ChevronLeft } from "lucide-react";

export default function ToolsHub() {
  const tools = [
    { 
      id: "chat-with-pdf",
      icon: Brain, 
      title: "Chat with Document", 
      desc: "Interact with massive 10,000-page files instantly without limits. Perfect for researchers and students.",
      href: "/chat-with-pdf",
      badge: "Flagship"
    },
    { 
      id: "contract-analyzer",
      icon: Search, 
      title: "Legal Contract Analyzer", 
      desc: "Instantly find loopholes, hidden clauses, and risks in legal documents with AI.",
      href: "#",
    },
    { 
      id: "merge",
      icon: Plus, 
      title: "Merge Heavy Files", 
      desc: "Combine 500MB+ documents seamlessly. Zero file-size restrictions.",
      href: "#",
    },
    { 
      id: "split",
      icon: FileText, 
      title: "Extract Pages", 
      desc: "Split or pull out specific pages from heavy books and magazines.",
      href: "#",
    },
    { 
      id: "compress",
      icon: Zap, 
      title: "Compress Document", 
      desc: "Reduce huge file sizes heavily without losing visual quality.",
      href: "#",
    },
    { 
      id: "unlock",
      icon: XCircle, 
      title: "Unlock & Decrypt", 
      desc: "Remove passwords from protected files in bulk securely.",
      href: "#",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Simple Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 sm:px-12">
        <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mr-auto">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Back to home</span>
        </Link>
        <div className="flex items-center gap-2 cursor-pointer absolute left-1/2 -translate-x-1/2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-slate-900 shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Omni</span>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto py-16 px-6">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">All Tools</h1>
          <p className="text-slate-500">Select a tool to get started. 100% free, 100% private.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((t) => (
            <Link key={t.id} href={t.href} className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-sky-300 transition-all cursor-pointer block overflow-hidden">
              {t.badge && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-sky-400 to-sky-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm">
                  {t.badge}
                </div>
              )}
              <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center mb-5 group-hover:bg-sky-500 transition-colors border border-slate-100 group-hover:border-sky-500">
                <t.icon className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{t.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
