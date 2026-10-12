import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Chat with PDF — Ask Questions from 10,000 Page Documents",
  description:
    "Upload any PDF up to 10,000 pages and ask questions instantly. AI-powered PDF chat with pinpoint citations. No sign-up, no file size limit, 100% private.",
  keywords: [
    "chat with pdf",
    "ai pdf reader",
    "ask questions from pdf",
    "pdf question answer ai",
    "talk to pdf free",
    "pdf chatbot no sign up",
    "ai chat with document",
    "pdf ai assistant free",
  ],
  alternates: { canonical: "https://omni-pdf.com/chat-with-pdf" },
  openGraph: {
    title: "Chat with PDF — Ask Questions from 10,000 Page Documents | Omni",
    description: "Upload any PDF and ask questions with AI. Pinpoint citations, no sign-up, 100% private.",
    url: "https://omni-pdf.com/chat-with-pdf",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
