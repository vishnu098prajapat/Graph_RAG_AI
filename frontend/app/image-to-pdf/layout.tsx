import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Image to PDF Converter Free — JPG PNG WebP HEIC to PDF",
  description:
    "Convert JPG, PNG, WebP, HEIC and GIF images to PDF. Bulk convert multiple images. Free, no sign-up, instant download, 100% lossless quality.",
  keywords: [
    "image to pdf converter free",
    "jpg to pdf free online",
    "png to pdf converter",
    "convert images to pdf",
    "heic to pdf free",
    "webp to pdf online",
    "bulk image to pdf",
    "photos to pdf no sign up",
  ],
  alternates: { canonical: "https://omni-pdf.com/image-to-pdf" },
  openGraph: {
    title: "Image to PDF Free — JPG PNG WebP HEIC to PDF | Omni",
    description: "Convert any image format to PDF. Bulk convert, lossless quality. Free, no sign-up.",
    url: "https://omni-pdf.com/image-to-pdf",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
