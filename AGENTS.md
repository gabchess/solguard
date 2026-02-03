# AGENTS.md — SolGuard

## What Is This
SolGuard is an autonomous pre-emptive scam detection agent for Solana. It monitors new token launches in real-time, scores rug pull risk, and alerts users via a live dashboard and X/Twitter posts.

## The Gap
- zachxbt = investigates AFTER scams
- samczsun/SEAL = responds DURING exploits
- **SolGuard = warns BEFORE users get rugged**

## Tech Stack
- **Runtime:** Node.js 24+
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** SQLite via better-sqlite3 (local, fast, no infra)
- **Scanner:** @solana/web3.js + Helius API (WebSocket for real-time)
- **Risk Data:** RugCheck API (api.rugcheck.xyz)
- **X Posting:** X API v2 (OAuth 1.0a)
- **Deploy:** Vercel (free tier)

## Folder Structure
```
solguard/
├── AGENTS.md
├── package.json
├── next.config.js
├── tailwind.config.js
├── .env.local              # API keys (Helius, RugCheck, X API)
├── db/
│   └── schema.sql          # SQLite schema
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Dashboard (main page)
│   │   ├── roadmap/
│   │   │   └── page.tsx    # Roadmap tab
│   │   └── api/
│   │       ├── tokens/     # API: list tokens with risk scores
│   │       └── scan/       # API: trigger manual scan
│   ├── components/
│   │   ├── TokenTable.tsx   # Main token list with color coding
│   │   ├── RiskBadge.tsx    # RED/YELLOW/GREEN badge
│   │   ├── TokenDetail.tsx  # Expanded token view
│   │   └── Header.tsx
│   ├── lib/
│   │   ├── db.ts           # SQLite connection
│   │   ├── scanner.ts      # pump.fun WebSocket listener
│   │   ├── risk-engine.ts  # Risk score calculation
│   │   ├── rugcheck.ts     # RugCheck API client
│   │   ├── helius.ts       # Helius API client
│   │   ├── wallet-graph.ts # Fund flow tracing
│   │   └── twitter.ts      # X API v2 poster
│   └── types/
│       └── index.ts        # TypeScript types
└── scripts/
    ├── seed-db.js          # Create tables
    └── test-scanner.js     # Test WebSocket listener
```

## Coding Standards
- TypeScript strict mode
- All API keys in .env.local (never committed)
- Functions < 50 lines, clear names
- Error handling on all external API calls (RugCheck, Helius, Solana RPC)
- No banned words in any user-facing text (see voice guide)
- Git: user.name='Aria Linkwell', user.email='aria@arialinkwell.dev'

## Key Constraints
- MVP = Live dashboard + X alerts. ONE feature done well.
- Use RugCheck API for risk data (don't reinvent the wheel)
- Use existing honeypot checkers (don't build our own)
- X posts: no hashtags, no links (shadowban risk), critical alerts only
- Dashboard must be fast, clean, mobile-friendly
- Color coding: RED (0-30 score), YELLOW (31-60), GREEN (61-100)

## Risk Score Formula (v1)
Weighted average:
- Deployer history (40%) — prior rugs from RugCheck
- LP status (25%) — locked? how long? amount?
- Mint authority (15%) — revoked = safe
- Holder concentration (10%) — top 10 holders %
- Token age (10%) — newer = riskier

## API Endpoints
- GET /api/tokens — list all tracked tokens with risk scores
- GET /api/tokens/[mint] — single token detail + wallet graph
- POST /api/scan — manually trigger a token scan
