import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "OCR — PDF & Image to Text Free | Hindi + English",
  description:
    "Extract editable text from scanned PDFs and images (JPG, PNG). Supports Hindi and English OCR. Free, no sign-up, instant copy and download.",
  keywords: [
    "ocr pdf to text free",
    "hindi ocr online free",
    "image to text converter",
    "scan pdf to text",
    "ocr tool free no sign up",
    "hindi english ocr",
    "extract text from scanned pdf",
    "jpg to text free",
    "png to text online",
  ],
  alternates: { canonical: "https://omni-pdf.com/ocr" },
  openGraph: {
    title: "OCR — PDF & Image to Text Free (Hindi + English) | Omni",
    description: "Extract text from scanned PDFs and images. Hindi + English OCR. Free, no sign-up.",
    url: "https://omni-pdf.com/ocr",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
