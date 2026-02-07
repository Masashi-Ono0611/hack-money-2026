import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ghost Yield",
  description: "Cross-chain settlement dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Ghost Yield
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                Home
              </Link>
              <Link href="/settlement" className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50">
                Settlement
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
