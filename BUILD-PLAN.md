# SolGuard Build Plan — Atomic Tasks

## Phase 0: Scaffold (Tonight Feb 3)

### T1: Initialize Next.js project with TypeScript + Tailwind
- Create Next.js 14 app with App Router, TypeScript, Tailwind CSS
- Install: better-sqlite3, @solana/web3.js, axios, dotenv, oauth-1.0a
- Create .env.local template
- **Pass:** `npm run dev` starts without errors, Tailwind renders

### T2: SQLite database schema + seed script
- Create db/schema.sql with tables: tokens, scans, alerts
- tokens: mint, name, symbol, deployer, risk_score, lp_locked, mint_authority, holder_count, top_holder_pct, created_at, updated_at, status (RED/YELLOW/GREEN)
- scans: id, token_mint, scan_type, result_json, scanned_at
- alerts: id, token_mint, alert_type, tweet_id, posted_at
- Create scripts/seed-db.js to initialize
- **Pass:** Run seed script, tables exist, can INSERT + SELECT

### T3: RugCheck API client
- Create src/lib/rugcheck.ts
- Function: getTokenReport(mint) → { risk_score, risks[], deployer_history }
- Function: getDeployerTokens(wallet) → previous tokens list
- Handle rate limits and errors gracefully
- **Pass:** Call with known token mint, get valid response logged

## Phase 1: Risk Engine (Feb 4-5)

### T4: Risk score calculation engine
- Create src/lib/risk-engine.ts
- Input: RugCheck data + token metadata
- Output: 0-100 score + RED/YELLOW/GREEN status + reasons array
- Weights: deployer (40%), LP (25%), mint auth (15%), concentration (10%), age (10%)
- **Pass:** Score 3 known tokens (1 rug, 1 legit, 1 mid), scores make sense

### T5: Helius API client for wallet history
- Create src/lib/helius.ts
- Function: getWalletHistory(address) → recent transactions
- Function: getTokenHolders(mint) → top holders with percentages
- **Pass:** Query a known wallet, get transaction list

### T6: Basic wallet graph (2-hop fund flow)
- Create src/lib/wallet-graph.ts
- Input: deployer address
- Trace: who funded deployer → who funded those wallets
- Output: { deployer, funders: [{ address, previousRugs, fundedBy }] }
- **Pass:** Trace a known deployer, get 2-hop graph

## Phase 2: Dashboard (Feb 5-7)

### T7: Dashboard layout + TokenTable component
- Create main page (src/app/page.tsx) with header, stats bar, token table
- TokenTable: sortable columns (name, score, status, deployer, time)
- RiskBadge: color-coded RED/YELLOW/GREEN pill
- Auto-refresh every 30 seconds
- **Pass:** Page renders with mock data, sorting works, colors correct

### T8: API routes for token data
- GET /api/tokens → paginated list from SQLite
- GET /api/tokens/[mint] → single token detail + risk breakdown
- **Pass:** curl returns JSON with correct structure

### T9: Token detail view
- Click token row → expanded view with risk breakdown
- Show: risk reasons, deployer history, LP info, holder distribution
- Show wallet graph (simple tree view for v1)
- **Pass:** Click a token, detail panel opens with all data

### T10: Real-time updates with polling
- Dashboard polls /api/tokens every 30s
- New tokens appear at top with highlight animation
- Stats bar: total tokens tracked, avg risk score, # RED flags today
- **Pass:** Add token to DB, it appears on dashboard within 30s

## Phase 3: Scanner + Alerts (Feb 7-9)

### T11: pump.fun WebSocket listener
- Create src/lib/scanner.ts
- Connect to Solana WebSocket, subscribe to pump.fun program logs
- On new token: parse mint, name, symbol, deployer
- Save to SQLite + trigger risk scoring
- **Pass:** Run listener, new pump.fun tokens appear in DB

### T12: X API v2 alert poster
- Create src/lib/twitter.ts (OAuth 1.0a, same pattern as aria-onchain-analyst)
- Function: postAlert(token) → tweet with risk info
- Format: "[SolGuard] ⚠️ HIGH RISK: $TICKER\nScore: X/100\nDeployer rugged 5 tokens previously\nLP: unlocked"
- Only post for RED tokens (score < 30)
- **Pass:** Post test alert, get tweet ID back

### T13: Scanner → Risk Engine → DB → Alert pipeline
- Wire everything: new token detected → score → save → alert if RED
- Run as background process alongside Next.js
- **Pass:** Deploy a test token on devnet, full pipeline fires

## Phase 4: Polish (Feb 9-12)

### T14: Roadmap tab
- Create src/app/roadmap/page.tsx
- List future features: wallet graph v2, community scoring, honeypot integration, cross-chain, API for third parties
- **Pass:** /roadmap renders with feature list

### T15: Mobile responsive + design polish
- Dashboard works on mobile
- Dark theme, clean typography
- SolGuard logo/branding
- **Pass:** Looks good on mobile viewport

### T16: Demo video + Colosseum submission
- Record dashboard in action
- Show real-time token detection + risk scoring
- Submit to Colosseum before Feb 12 deadline
- **Pass:** Video uploaded, project submitted
