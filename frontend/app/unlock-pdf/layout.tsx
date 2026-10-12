import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Unlock PDF Free — Remove PDF Password Online",
  description:
    "Remove passwords from protected PDF files instantly. Decrypt and unlock PDFs in bulk. Free, 100% private, no sign-up required, no upload to server.",
  keywords: [
    "unlock pdf free",
    "remove pdf password",
    "decrypt pdf online free",
    "pdf password remover free",
    "unlock protected pdf",
    "pdf unlocker no sign up",
    "remove password from pdf free",
    "open locked pdf free",
  ],
  alternates: { canonical: "https://omni-pdf.com/unlock-pdf" },
  openGraph: {
    title: "Unlock PDF Free — Remove PDF Password | Omni",
    description: "Remove passwords from PDFs instantly. Free, no sign-up, 100% private.",
    url: "https://omni-pdf.com/unlock-pdf",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
