import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Extract PDF Pages Free — Split & Save Pages from PDF",
  description:
    "Extract specific pages from any PDF and save as a new file. Split PDFs by page range. Free, no sign-up, instant download, 100% private.",
  keywords: [
    "extract pdf pages free",
    "split pdf online free",
    "pdf page extractor",
    "extract pages from pdf",
    "split pdf no sign up",
    "pdf splitter free online",
    "save specific pages from pdf",
  ],
  alternates: { canonical: "https://omni-pdf.com/extract-pdf" },
  openGraph: {
    title: "Extract PDF Pages Free — Split PDF | Omni",
    description: "Extract specific pages from PDFs instantly. Free, no sign-up, 100% private.",
    url: "https://omni-pdf.com/extract-pdf",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
