import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PDF to Word Converter Free — Convert PDF to Editable DOCX",
  description:
    "Convert any PDF to an editable Word (.docx) file. Layout preserved, text extracted perfectly. 100% offline, free, no sign-up, unlimited conversions.",
  keywords: [
    "pdf to word converter free",
    "convert pdf to docx",
    "pdf to word online free",
    "pdf to word no sign up",
    "free pdf to word converter offline",
    "pdf to editable word document",
    "pdf converter to docx free",
  ],
  alternates: { canonical: "https://omni-pdf.com/pdf-to-word" },
  openGraph: {
    title: "PDF to Word Free — Convert PDF to Editable DOCX | Omni",
    description: "Convert PDF to .docx Word instantly. Layout preserved. 100% offline, free, no sign-up.",
    url: "https://omni-pdf.com/pdf-to-word",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
