import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "The Decision Engine",
  description: "An AI system that knows when it is allowed to act: execute, ask, defer, escalate, or refuse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink font-sans antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
