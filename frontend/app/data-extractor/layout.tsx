import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Extract Emails & Phone Numbers from PDF Free — Lead Extractor",
  description:
    "Mine emails, phone numbers and website links from PDF documents. Export results to CSV. Perfect for lead generation. Free, no sign-up, 100% offline.",
  keywords: [
    "extract emails from pdf free",
    "pdf lead extractor",
    "phone number extractor from pdf",
    "email scraper from pdf",
    "pdf data extractor free",
    "extract contact info from pdf",
    "pdf to csv contacts",
    "lead generation from pdf",
  ],
  alternates: { canonical: "https://omni-pdf.com/data-extractor" },
  openGraph: {
    title: "Extract Emails & Phones from PDF Free — Lead Extractor | Omni",
    description: "Mine emails, phones, links from PDFs. Export to CSV. Free, no sign-up, 100% offline.",
    url: "https://omni-pdf.com/data-extractor",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
