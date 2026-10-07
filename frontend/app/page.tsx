import Link from "next/link";
import { Zap, Play, Star, Brain, Search, Plus, FileText, XCircle, Unlock, Edit3 } from "lucide-react";

export default function Home() {
  const tools = [
    { 
      id: "chat-with-pdf",
      icon: Brain, 
      title: "Chat with Document", 
      desc: "Interact with massive 10,000-page files instantly without limits. Perfect for researchers and students.",
      href: "/chat-with-pdf",
      badge: "Flagship",
      colorClass: "text-indigo-600",
      bgClass: "bg-indigo-50",
      hoverBgClass: "group-hover:bg-indigo-500",
      borderHoverClass: "hover:border-indigo-200"
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
      borderHoverClass: "hover:border-emerald-200"
    },
    { 
      id: "split",
      icon: FileText, 
      title: "Extract Pages", 
      desc: "Split or pull out specific pages from heavy books and magazines.",
      href: "/extract-pdf",
      colorClass: "text-amber-600",
      bgClass: "bg-amber-50",
      hoverBgClass: "group-hover:bg-amber-500",
      borderHoverClass: "hover:border-amber-200"
    },
    { 
      id: "edit",
      icon: Edit3, 
      title: "Document Editor", 
      desc: "Extract perfect text from PDF, format it, style it, and re-export instantly.",
      href: "/edit-pdf",
      colorClass: "text-teal-600",
      bgClass: "bg-teal-50",
      hoverBgClass: "group-hover:bg-teal-500",
      borderHoverClass: "hover:border-teal-200"
    },
    { 
      id: "compress",
      icon: Zap, 
      title: "Compress Document", 
      desc: "Reduce huge file sizes heavily without losing visual quality.",
      href: "/compress-pdf",
      colorClass: "text-sky-600",
      bgClass: "bg-sky-50",
      hoverBgClass: "group-hover:bg-sky-500",
      borderHoverClass: "hover:border-sky-200"
    },
    { 
      id: "unlock",
      icon: XCircle, 
      title: "Unlock & Decrypt", 
      desc: "Remove passwords from protected files in bulk securely.",
      href: "/unlock-pdf",
      colorClass: "text-fuchsia-600",
      bgClass: "bg-fuchsia-50",
      hoverBgClass: "group-hover:bg-fuchsia-500",
      borderHoverClass: "hover:border-fuchsia-200"
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF8F5]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Navbar */}
      <header className="absolute top-0 inset-x-0 h-20 z-50 flex items-center justify-between px-6 sm:px-12">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#6366F1] shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Omni</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#tools" className="hover:text-slate-900 transition-colors">Product</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Use cases</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Pricing</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Changelog</a>
        </nav>
        <div className="flex items-center gap-5">
          <button className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Log in</button>
          <button className="text-sm font-semibold text-white bg-[#111827] px-5 py-2.5 rounded-full hover:bg-black transition-colors shadow-sm">
            Try it free
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-[140px] pb-12 px-6 flex flex-col items-center justify-center text-center">
        
        {/* Badge */}
        <div className="mb-10 inline-flex items-center gap-2 rounded-full bg-[#F3F4F6] pl-1 pr-4 py-1 hover:bg-[#E5E7EB] transition-colors cursor-pointer">
          <span className="bg-[#6366F1] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">New</span>
          <span className="text-sm font-medium text-[#4B5563]">10,000 page limit unlocked for free &rarr;</span>
        </div>

        {/* Big Bold Headline - Exact 2 lines */}
        <div className="max-w-[1200px] mx-auto mb-6 w-full">
          <h1 className="text-5xl sm:text-7xl lg:text-[88px] font-bold tracking-tight text-[#111827] leading-[1.05]">
            <span className="whitespace-nowrap block">The universal workspace.</span>
            <span className="text-[#6366F1] italic pr-2">No limits.</span> 
            <span className="relative z-10 inline-block">
              No sign-ups.
              <span className="absolute bottom-1 left-0 w-full h-[28px] bg-[#FDE047]/60 -z-10 rounded-sm transform -rotate-1"></span>
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#6B7280] leading-relaxed mb-8">
          Omni reads, merges, and analyzes massive documents up to 10,000 pages. 
          Everything runs directly on your machine with zero retention.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <a href="#tools" className="text-base font-semibold text-white bg-[#111827] px-8 py-3.5 rounded-full hover:bg-black transition-all hover:scale-[1.02] active:scale-95 shadow-lg w-full sm:w-auto">
            Start for free
          </a>
          <button className="text-base font-semibold text-[#374151] bg-[#FAF8F5] border border-[#E5E7EB] px-8 py-3.5 rounded-full hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-95 shadow-sm inline-flex items-center justify-center gap-2 w-full sm:w-auto">
            <div className="w-5 h-5 rounded-full bg-[#EEF2FF] flex items-center justify-center">
              <Play className="w-2.5 h-2.5 text-[#6366F1] fill-[#6366F1] ml-0.5" />
            </div>
            Watch a 2-min demo
          </button>
        </div>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-slate-200 z-${10-i} overflow-hidden`}>
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=e2e8f0`} alt="Avatar" />
              </div>
            ))}
          </div>
          <div className="flex flex-col items-start text-left">
            <div className="flex gap-1 mb-0.5">
              {[1,2,3,4,5].map((i) => <Star key={i} className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />)}
              <span className="text-xs font-bold text-[#374151] ml-1">4.9</span>
            </div>
            <span className="text-[11px] text-[#6B7280]">from 4,000+ teams who hate limits</span>
          </div>
        </div>
      </section>

      {/* Tools Grid Section (Directly Below Hero) */}
      <section id="tools" className="max-w-[1280px] mx-auto py-12 px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((t) => (
            <Link key={t.id} href={t.href} className={`group relative bg-[#FAF8F5] p-6 rounded-2xl shadow-sm border border-slate-200 transition-all duration-300 cursor-pointer block overflow-hidden hover:-translate-y-1 hover:shadow-xl ${t.borderHoverClass}`}>
              {t.badge && (
                <div className="absolute top-0 right-0 bg-[#6366F1] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm">
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
      
      {/* Simple Footer */}
      <footer className="border-t border-[#E5E7EB] py-8 mt-12">
        <p className="text-center text-sm text-[#9CA3AF]">© 2026 Omni. The universal workspace.</p>
      </footer>
    </main>
  );
}


