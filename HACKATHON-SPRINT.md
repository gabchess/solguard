# SolGuard — Hackathon Sprint (Feb 9-12)

## Colosseum x Solana Agent Hackathon
- **Prize:** $100K — 1st: $50K, 2nd: $30K, 3rd: $15K, Most Agentic: $5K
- **Deadline:** Feb 12
- **Edge:** NOBODY else doing security. 158 projects, all DeFi bots.

## Current State
- Live at solguard-lilac.vercel.app
- Phase A (bugs) DONE, Phase B (UI) DONE
- WOW1 (search bar) DONE, WOW6 (Solana docs) DONE
- Turso cloud DB, Vercel deployed, security audit done

## Sprint Priority (ordered by judge impact)

### 1. WOW5: Auto-Scan Mode (MOST AGENTIC — judges love this)
- pump.fun WebSocket already works in scanner.ts
- Add a visible "Live Scanning" indicator on dashboard
- New tokens appear in real-time with animation
- Show scanning status: "Monitoring pump.fun... 47 tokens scanned today"
- This is THE feature that wins "Most Agentic" ($5K minimum)

### 2. WOW3: Serial Rugger Profile Page (/deployer/[address])
- Aggregate all tokens by same deployer
- Show: rug count, avg risk score, timeline of launches
- Badge: "Serial Rugger" if 3+ RED tokens
- Link from token table
- WHY: Investigation layer no other tool has

### 3. WOW2: Risk Distribution Chart
- Recharts donut chart: RED/YELLOW/GREEN proportions
- Visual instant understanding of ecosystem health
- Quick win, big visual impact for demo

### 4. Video Demo + Submission
- Screen recording of live dashboard
- Show: auto-scanning, search bar, deployer profile, risk scores
- Narrate key features
- Submit to Colosseum

## What NOT to build (time is limited)
- Skip WOW4 (fund-flow graph) — too complex for 3 days
- Skip Telegram bot — dashboard + X alerts enough
- Skip wallet graph visualization — deployer profile is enough

## Tech Notes
- Project: C:\Users\gavaf\projects\solguard
- Stack: Next.js 14 + TypeScript + Tailwind + Turso/SQLite
- GitHub: github.com/gabchess/solguard (private)
- Deploy: Vercel (solguard-lilac.vercel.app)
