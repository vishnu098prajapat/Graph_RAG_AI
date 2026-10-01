"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeroUpload } from "@/components/hero-upload";
import { Workbench } from "@/components/workbench";
import type { DocInfo } from "@/lib/api";

export default function Home() {
  const [docs, setDocs] = useState<DocInfo[] | null>(null);

  return (
    <main className="relative min-h-screen">
      <AnimatePresence mode="wait">
        {docs === null ? (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97, filter: "blur(8px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroUpload onReady={setDocs} />
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
