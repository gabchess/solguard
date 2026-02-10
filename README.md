# SolGuard

**Pre-emptive scam detection for Solana.** SolGuard monitors new token launches in real-time, scores rug pull risk before users get rugged, and alerts the community via a live dashboard and autonomous X/Twitter posts.

## The Problem

98.6% of pump.fun tokens are rug pulls (Solidus Labs, 2025). Thousands launch daily. Existing tools like RugCheck and SolSniffer are passive: you have to know to check a token before you buy it. Most users don't.

The security gap on Solana looks like this:

- **zachxbt** investigates scams *after* they happen
- **samczsun / SEAL** responds to exploits *during* attacks
- **Nobody** warns users *before* they get rugged

SolGuard fills that gap.

## How It Works

## 🤖 Built by Aria — An Autonomous AI Agent

SolGuard was designed, built, and shipped in 8 days by **Aria** ([@AriaLinkwell](https://x.com/AriaLinkwell)), an autonomous AI agent running on [OpenClaw](https://openclaw.ai) with persistent memory, cron scheduling, and sub-agent orchestration.

**Agent setup:**
- Aria runs 24/7 on a dedicated machine with her own SOUL.md, memory files, and decision framework
- Planning, architecture, and code generation handled autonomously via Claude Code (Opus 4.6)
- ERC-8004 Agent ID: #1664 on Base

**What Aria did autonomously:**
- Designed the 5-factor risk scoring engine and weight distribution
- Built the DexScreener auto-feed integration and serial rugger detection
- Created the cyberpunk UI with real-time token scanning dashboard
- Implemented dual-weight scoring (deployer history at 40%)
- Shipped 40+ commits across 8 days
- Set up automated cron jobs for continuous token monitoring

**Human involvement was limited to:**
- Providing initial product direction ("build a Solana token security scanner")
- Deploying to Vercel and managing GitHub pushes
- Recording the demo video


SolGuard connects to Solana's mainnet via WebSocket, listens for pump.fun token creation events, and runs every new token through a 5-factor risk engine:

| Factor | Weight | What it checks |
|--------|--------|----------------|
| **Deployer History** | 40% | Has this wallet launched rug pulls before? How many tokens total? |
| **Liquidity** | 25% | Is LP locked? What percentage? For how long? |
| **Token Authority** | 15% | Is mint authority revoked? Freeze authority? Mutable metadata? |
| **Holder Concentration** | 10% | Does one wallet hold a dangerous % of supply? |
| **Token Age** | 10% | How old is this token? Minutes-old tokens are higher risk. |

Each token gets a score from 0 (extremely dangerous) to 100 (safe), with a color-coded status:

- 🔴 **RED** (0-30): High rug pull risk. Avoid.
- 🟡 **YELLOW** (31-60): Proceed with caution. Multiple risk flags.
- 🟢 **GREEN** (61-100): Lower risk. Standard safety checks passed.

## Features

**Live Dashboard**
- Real-time token risk monitoring with auto-refresh
- Filter by risk level (RED / YELLOW / GREEN) with counts
- Sort by newest, oldest, or risk score
- Expandable token detail with visual risk breakdown (5 factor bars)
- External links to RugCheck, Solscan, and DexScreener
- Mobile responsive (card layout on small screens, table on desktop)

**Autonomous Scanner**
- WebSocket connection to Solana mainnet via Helius
- Monitors pump.fun program for new token creation events
- Automatic scanning with RugCheck API integration
- Deployer wallet history analysis via Helius Enhanced Transactions API
- Serial rugger detection (cross-references deployer's past tokens in local DB)

**Alert System**
- X/Twitter posting for high-risk token discoveries
- Configurable alert thresholds

## Tech Stack

- **Runtime:** Node.js 24+
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Database:** SQLite via better-sqlite3
- **Blockchain:** @solana/web3.js (WebSocket subscription)
- **APIs:** Helius (deployer history, wallet assets), RugCheck (token risk data)
- **Alerts:** X API v2 (OAuth 1.0a)

## Getting Started

### Prerequisites

- Node.js 24+
- npm
- API keys: [Helius](https://helius.dev) (free tier works), [X API](https://developer.x.com) (for alerts)

### Installation

```bash
git clone https://github.com/gabchess/solguard.git
cd solguard
npm install
```

### Configuration

Create `.env.local` in the project root:

```env
HELIUS_API_KEY=your_helius_api_key

# Optional: X/Twitter alerts
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
X_ACCESS_TOKEN=your_x_access_token
X_ACCESS_SECRET=your_x_access_secret
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The scanner starts automatically and begins monitoring pump.fun for new token launches.

## Project Structure

```
solguard/
├── db/
│   └── schema.sql          # SQLite schema (tokens, scans, alerts)
├── src/
│   ├── app/
│   │   ├── page.tsx         # Dashboard (main UI)
│   │   ├── roadmap/
│   │   │   └── page.tsx     # Roadmap page
│   │   └── api/
│   │       ├── tokens/      # GET: list tokens with stats
│   │       └── scan/        # POST: trigger manual scan
│   ├── lib/
│   │   ├── scanner.ts       # pump.fun WebSocket listener
│   │   ├── risk-engine.ts   # 5-factor risk scoring
│   │   ├── rugcheck.ts      # RugCheck API client
│   │   ├── helius.ts        # Helius API client
│   │   ├── alerts.ts        # X/Twitter alert posting
│   │   └── db.ts            # SQLite operations
│   └── types/
│       └── index.ts         # TypeScript interfaces
└── AGENTS.md                # AI agent build instructions
```

## Roadmap

**Current (MVP)**
- [x] Real-time pump.fun scanner
- [x] 5-factor risk scoring engine
- [x] Live dashboard with filters, sorting, risk breakdown
- [x] Deployer history analysis
- [x] Mobile responsive UI
- [x] X/Twitter alert integration

**Next**
- [ ] "Scan Any Token" search bar (paste mint address, get instant risk score)
- [ ] Serial Rugger Profile pages (/deployer/[address])
- [ ] Deployer fund-flow graph visualization
- [ ] Telegram bot alerts
- [ ] DeFi protocol anomaly detection (large fund movements, suspicious contract upgrades)
- [ ] On-chain risk attestations

## How the Risk Engine Works

The scoring is intentionally conservative. A few key overrides ensure dangerous tokens can't game their way to a GREEN score:

1. **Any deployer with previous rugs:** Score capped at YELLOW, regardless of other factors
2. **Active mint authority:** Score capped at YELLOW (new tokens can be minted at any time)
3. **Unknown deployer (no history):** Deployer factor starts at 40/100, not 50

The engine uses data from RugCheck (token authorities, LP status, holder concentration, risk flags) combined with Helius (deployer transaction history, token age). Local DB tracks which deployers have launched RED tokens, building a serial rugger database over time.

## License

MIT

## Built For

[Colosseum Solana Agent Hackathon](https://colosseum.com/agent-hackathon) (February 2026)

Built by [@gabe_onchain](https://x.com/gabe_onchain) and [@AriaLinkwell](https://x.com/AriaLinkwell)
