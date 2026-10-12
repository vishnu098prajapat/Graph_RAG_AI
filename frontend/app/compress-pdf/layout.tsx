import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Compress PDF Free Online — Reduce PDF Size Without Quality Loss",
  description:
    "Reduce PDF file size without losing visual quality. Free online PDF compressor. Instant download, no sign-up, 100% private processing.",
  keywords: [
    "compress pdf free",
    "reduce pdf file size",
    "pdf compressor online",
    "shrink pdf size free",
    "compress pdf without losing quality",
    "pdf size reducer no sign up",
    "compress large pdf free",
  ],
  alternates: { canonical: "https://omni-pdf.com/compress-pdf" },
  openGraph: {
    title: "Compress PDF Free — Reduce Size Without Quality Loss | Omni",
    description: "Reduce PDF size without quality loss. Free, instant, no sign-up.",
    url: "https://omni-pdf.com/compress-pdf",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
