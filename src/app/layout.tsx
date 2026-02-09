import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SolGuard — Autonomous Pre-Emptive Scam Detection for Solana",
  description: "Real-time rug pull detection agent for Solana. Monitors pump.fun, scores risk with 5-factor analysis, and alerts before you get rugged.",
  openGraph: {
    title: "SolGuard — Pre-Emptive Scam Detection for Solana",
    description: "Autonomous agent that monitors pump.fun in real-time, scores rug pull risk, and warns before you buy. Built for the Colosseum Solana Agent Hackathon.",
    siteName: "SolGuard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolGuard — Pre-Emptive Scam Detection for Solana",
    description: "Autonomous agent that monitors pump.fun in real-time, scores rug pull risk, and warns before you buy.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <nav className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛡️</span>
              <span className="text-xl font-bold text-white">SolGuard</span>
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">BETA</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="/" className="text-white hover:text-blue-400 transition">Dashboard</a>
              <a href="/roadmap" className="text-gray-400 hover:text-white transition">Roadmap</a>
              <span className="text-gray-500 cursor-not-allowed" title="Coming soon">Docs</span>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-800 px-6 py-4 mt-12">
          <div className="max-w-7xl mx-auto text-center text-xs text-gray-600">
            SolGuard — Autonomous pre-emptive scam detection for Solana. Built for Colosseum × Solana Agent Hackathon 2026.
          </div>
        </footer>
      </body>
    </html>
  );
}
