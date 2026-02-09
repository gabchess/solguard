import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "SOLGUARD // SYSTEM ACCESS",
  description: "Advanced Pre-Emptive Threat Detection for Solana. Neural network analysis of token contracts.",
  openGraph: {
    title: "SOLGUARD // SYSTEM ACCESS",
    description: "Advanced Pre-Emptive Threat Detection for Solana. Neural network analysis of token contracts.",
    siteName: "SolGuard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOLGUARD // SYSTEM ACCESS",
    description: "Advanced Pre-Emptive Threat Detection for Solana.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.variable} antialiased min-h-screen selection:bg-cyber-blue selection:text-cyber-black`}>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--color-cyber-blue)_0%,_transparent_100%)] opacity-5 pointer-events-none z-0" />
        
        <nav className="relative z-10 border-b border-cyber-gray/50 bg-cyber-black/80 backdrop-blur-md px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]">🛡️</span>
                <div className="absolute inset-0 bg-cyber-blue blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-wider text-white group-hover:text-cyber-blue transition-colors">SOLGUARD</span>
                <span className="text-[10px] text-cyber-blue/60 tracking-[0.2em] font-light">SYSTEM_ONLINE</span>
              </div>
              <span className="ml-2 text-[10px] border border-cyber-red/50 text-cyber-red px-1.5 py-0.5 rounded font-medium bg-cyber-red/10 animate-pulse">BETA_ACCESS</span>
            </div>
            <div className="flex items-center gap-8 text-sm tracking-wide">
              <a href="/" className="text-cyber-blue border-b border-cyber-blue pb-0.5 drop-shadow-[0_0_5px_rgba(0,212,255,0.5)]">DASHBOARD</a>
              <a href="/roadmap" className="text-gray-500 hover:text-white transition hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">ROADMAP</a>
              <span className="text-gray-700 cursor-not-allowed decoration-slice">DOCS_LOCKED</span>
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>

        <footer className="relative z-10 border-t border-cyber-gray/50 px-6 py-4 mt-12 bg-cyber-black/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] text-gray-600 uppercase tracking-wider">
            <div>
              SolGuard System v0.9.2 // Security Level: MAXIMUM
            </div>
            <div className="flex gap-4">
               <span>Latency: <span className="text-green-500">12ms</span></span>
               <span>Status: <span className="text-green-500">OPERATIONAL</span></span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
