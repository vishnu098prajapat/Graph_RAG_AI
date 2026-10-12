import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://omni-pdf.com"),
  title: {
    default: "Omni — Free PDF Tools. No Sign-up. No Limits.",
    template: "%s | Omni PDF Tools",
  },
  description:
    "Free online PDF tools — merge, compress, OCR, chat with documents, convert to Word/Excel. Process PDFs up to 10,000 pages. 100% private, no sign-up required.",
  keywords: [
    "free pdf tools",
    "online pdf editor",
    "pdf converter no sign up",
    "merge pdf free",
    "compress pdf online",
    "ocr pdf to text",
    "chat with pdf",
    "pdf to word converter",
    "pdf tools no registration",
    "pdf tools offline",
  ],
  authors: [{ name: "Omni PDF" }],
  creator: "Omni PDF",
  publisher: "Omni PDF",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://omni-pdf.com",
    siteName: "Omni PDF Tools",
    title: "Omni — Free PDF Tools. No Sign-up. No Limits.",
    description:
      "Merge, compress, OCR, chat with documents, convert to Word/Excel. 100% private, no registration.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Omni PDF Tools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Omni — Free PDF Tools. No Sign-up. No Limits.",
    description: "Free PDF tools. 100% private, no sign-up.",
    images: ["/og-image.png"],
  },
  alternates: { canonical: "https://omni-pdf.com" },
};

const siteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Omni PDF Tools",
  url: "https://omni-pdf.com",
  description: "Free online PDF tools — no sign-up, no file size limits.",
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Omni PDF",
  url: "https://omni-pdf.com",
  logo: "https://omni-pdf.com/logo.png",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
