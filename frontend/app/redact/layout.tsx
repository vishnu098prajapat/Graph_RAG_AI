import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Redact PDF Free — Auto-Censor Emails, Phones & Cards",
  description:
    "Permanently remove sensitive information (emails, phone numbers, credit cards) from PDF files. Secure offline redaction tool. Free, no sign-up, 100% private.",
  keywords: [
    "redact pdf free",
    "censor pdf online free",
    "remove sensitive information from pdf",
    "pdf redaction tool",
    "blackout text in pdf free",
    "pdf privacy tool",
    "auto redact pdf emails phones",
    "pdf censor free no sign up",
  ],
  alternates: { canonical: "https://omni-pdf.com/redact" },
  openGraph: {
    title: "Redact PDF Free — Auto-Censor Sensitive Information | Omni",
    description: "Permanently remove emails, phones, card numbers from PDFs. 100% offline, free, no sign-up.",
    url: "https://omni-pdf.com/redact",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
