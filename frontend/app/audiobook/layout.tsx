import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PDF to Audiobook Free — Listen to PDF as Audio",
  description:
    "Convert any PDF to an audiobook. Page-by-page audio streaming with adjustable voices and speed. Listen to documents like podcasts. Free, no sign-up.",
  keywords: [
    "pdf to audiobook free",
    "pdf to audio converter",
    "listen to pdf free",
    "text to speech pdf online",
    "pdf reader audio free",
    "convert pdf to mp3",
    "pdf audiobook no sign up",
    "pdf to podcast",
  ],
  alternates: { canonical: "https://omni-pdf.com/audiobook" },
  openGraph: {
    title: "PDF to Audiobook Free — Listen to PDF | Omni",
    description: "Convert PDFs to audio. Adjustable voice & speed. Free, no sign-up.",
    url: "https://omni-pdf.com/audiobook",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
