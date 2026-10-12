import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Bank Statement PDF to Excel Free — PDF to Spreadsheet Converter",
  description:
    "Convert bank statements, invoices and tables from PDF to Excel (.xlsx). 100% offline, privacy-first. Free, no sign-up, your data never leaves your device.",
  keywords: [
    "pdf to excel free",
    "bank statement to excel",
    "convert pdf to spreadsheet",
    "pdf table to excel",
    "bank statement converter free",
    "pdf to xlsx online free",
    "invoice pdf to excel",
    "pdf data extractor to excel",
  ],
  alternates: { canonical: "https://omni-pdf.com/pdf-to-excel" },
  openGraph: {
    title: "Bank Statement PDF to Excel Free | Omni",
    description: "Convert bank statements and invoices PDF to Excel. 100% offline, free, no sign-up.",
    url: "https://omni-pdf.com/pdf-to-excel",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
