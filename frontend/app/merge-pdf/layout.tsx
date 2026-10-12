import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Merge PDF Files Free Online — No File Size Limit",
  description:
    "Combine multiple PDF files into one. No file size restrictions — merge 500MB+ PDFs instantly. 100% private, nothing uploaded to server. Free, no sign-up.",
  keywords: [
    "merge pdf free",
    "combine pdf files online",
    "merge pdf no size limit",
    "pdf merger free online",
    "merge large pdf files",
    "combine pdf no sign up",
    "pdf merge tool free",
  ],
  alternates: { canonical: "https://omni-pdf.com/merge-pdf" },
  openGraph: {
    title: "Merge PDF Free — No File Size Limit | Omni",
    description: "Combine 500MB+ PDFs instantly. No sign-up, 100% private, no file size restrictions.",
    url: "https://omni-pdf.com/merge-pdf",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
