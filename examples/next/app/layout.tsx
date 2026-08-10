import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  description: "A Next.js playground for trying Agent Feedback.",
  title: "Northstar — Next.js example"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
