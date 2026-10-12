"use client";

import { useEffect, useState } from "react";
import { Zap, Sun, Moon } from "lucide-react";

export default function ScrollHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read saved theme; default is light
    const saved = localStorage.getItem("omni-theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setDark(false);
    }
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Set initial state
    setScrolled(window.scrollY > 20);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("omni-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("omni-theme", "light");
    }
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 h-20 z-50 flex items-center justify-between px-4 sm:px-12 transition-all duration-300 ${
        scrolled
          ? "bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm"
          : "bg-transparent"
      }`}
    >
      {/* Logo — LEFT */}
      <a href="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-600 shadow-sm">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900">Omni</span>
      </a>

      {/* Nav + Toggle — RIGHT side together */}
      <div className="flex items-center gap-6 flex-shrink-0">
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {/* /#tools works from any page — home anchor or scroll */}
          <a href="/" className="hover:text-slate-900 transition-colors duration-150">Home</a>
          <a href="/#tools" className="hover:text-slate-900 transition-colors duration-150">Tools</a>
        </nav>

        {/* Toggle only renders after mount to prevent hydration mismatch */}
        {mounted && (
          <button
            onClick={toggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
            style={{
              background: dark ? "#1a1d27" : "#F3F4F6",
              borderColor: dark ? "#2D3348" : "#E5E7EB",
            }}
          >
            {dark
              ? <Sun className="w-4 h-4 text-yellow-400" />
              : <Moon className="w-4 h-4 text-slate-600" />
            }
          </button>
        )}
      </div>
    </header>
  );
}
