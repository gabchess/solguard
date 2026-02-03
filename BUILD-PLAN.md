# SolGuard Build Plan — Atomic Tasks

## Progress Summary
**Phase 0-1:** 11/16 original tasks DONE (69%)
**Next:** Fix bugs → Polish → WOW features → Demo → Submit

---

## ✅ COMPLETED (Feb 3 — Evening Session #1)

### T1: Initialize Next.js + TypeScript + Tailwind ✅
### T2: SQLite database schema + seed script ✅  
### T3: RugCheck API client ✅
### T4: Risk scoring engine (5-factor weighted) ✅
### T5: Helius API client (deployer history + wallet assets) ✅
### T7+T8: Dashboard UI + API routes ✅
### T11: pump.fun WebSocket scanner ✅
### T12: X API v2 alert poster (OAuth 1.0a) ✅
### T13: Full pipeline E2E tested (BONK/JUP/WIF) ✅
### T14: Roadmap page ✅

---

## 🔧 Phase A: Bug Fixes (Feb 4 — FIRST PRIORITY)
*Source: Claude Code brainstorm session Feb 3*

### BF1: Fix null guard on mint authority override
- **File:** `src/lib/risk-engine.ts:162`
- **Bug:** When `report` is null, `report?.token.mintAuthority` returns `undefined`. `undefined !== null` = true, so override ALWAYS fires. GREEN tokens wrongly become YELLOW.
- **Fix:** Change to `if (report && report.token.mintAuthority !== null && status === 'GREEN')`
- **Pass:** Token with no report data can score GREEN

### BF2: Wire deployer history into scanner (eliminate dead code)
- **File:** `src/lib/scanner.ts:45`
- **Bug:** `calculateRisk(report, summary, 0, 0)` — deployer history (30% weight!) is hardcoded to 0
- **Fix:** Call `getDeployerHistory()` from helius.ts, count TOKEN_MINT transactions, check if any previous tokens scored RED in our DB
- **Pass:** Scanning a deployer with previous tokens shows correct deployer score

### BF3: Fix async setTimeout error swallowing
- **Files:** `src/lib/scanner.ts:146-148, 168-170`
- **Bug:** `setTimeout(async () => { await scanToken(mint); }, 5000)` — Promise rejection unhandled
- **Fix:** Add `.catch(err => console.error('[SCANNER] Scan error:', err))`
- **Pass:** Intentional error in scanToken doesn't crash process

### BF4: Fix recursive startScanner interval leak
- **File:** `src/lib/scanner.ts:204-208`
- **Bug:** Recursive `startScanner()` never clears previous `setInterval`, stacking health checks
- **Fix:** Store intervalId, `clearInterval(intervalId)` before restart
- **Pass:** After reconnection, only 1 health-check interval runs

### BF5: Fix deployer score scale inconsistency
- **File:** `src/lib/risk-engine.ts:50`
- **Bug:** `(1 - rugRate) * 30` caps at 30, but scale is 0-100. Clean deployers score WORSE than unknowns
- **Fix:** Change multiplier from `30` to `100`
- **Pass:** Deployer with 1 rug in 100 tokens scores > 40 (unknown deployer score)

### BF6: Align AGENTS.md weights with risk-engine.ts
- **Bug:** AGENTS.md says deployer=40% but code has deployer=30%. Add token age factor (10%).
- **Fix:** Update weights: deployer 40%, LP 25%, authority 15%, concentration 10%, age 10%
- **Token age source:** Helius Enhanced Transactions API returns `timestamp` on TOKEN_MINT txs — reuse getDeployerHistory() data
- **Age scoring:** <1h = 0, <24h = 30, <7d = 60, >30d = 90, >1y = 100
- **Pass:** Weights sum to 1.0, old tokens score higher on age factor

---

## 🎨 Phase B: Polish + Essential UI (Feb 4-5)

### T9: Token detail view (expanded)
- Click token row → show full risk breakdown with visual gauge
- Show: risk factor breakdown (5 bars), deployer info, risk reasons, RugCheck link
- **Pass:** Click any token, detail panel shows breakdown

### T10: Real-time polling improvements
- Highlight new tokens with animation when they appear
- Show "last updated" timestamp
- **Pass:** Add token to DB, appears with highlight within 30s

### T15: Filter/Sort bar
- Add filter pills: All | 🔴 RED | 🟡 YELLOW | 🟢 GREEN
- Sort dropdown: Newest | Lowest Score | Highest Score
- **Pass:** Filtering works, sort works, URL params preserved

### T15b: Mobile responsive
- Dashboard works on mobile viewport
- Table becomes card layout on small screens
- **Pass:** Looks good on 375px width

---

## 🚀 Phase C: WOW Features (Feb 5-8)
*Source: Claude Code brainstorm session + X research*

### WOW1: "Scan Any Token" Search Bar
- Prominent search bar at top of dashboard
- Paste Solana mint address → instant risk breakdown
- Loading skeleton → animated result card
- Uses existing POST /api/scan endpoint
- **Why:** Makes demo INTERACTIVE for judges. They paste a token, they get an answer.
- **Pass:** Paste BONK mint → see risk score appear with animation

### WOW2: Risk Distribution Donut Chart
- Replace/augment stats bar with recharts donut chart
- Center: total count. Ring: RED/YELLOW/GREEN proportions with matching colors
- **Why:** Single visual > reading 3 numbers. Immediately communicates ecosystem health.
- **Pass:** Chart renders with correct proportions

### WOW3: Serial Rugger Profile Page (`/deployer/[address]`)
- Aggregate all tokens by same deployer wallet
- Show: rug count, avg risk score, timeline of launches
- Badge: "Serial Rugger" if 3+ tokens scored RED
- Link from token table deployer column
- **Why:** Investigative layer — no other tool shows deployer's full rap sheet
- **Pass:** Navigate to deployer page, see all their tokens listed

### WOW4: Deployer Fund-Flow Graph
- Visualize where deployer's funds came from / where rug proceeds went
- Use react-force-graph-2d or d3-force for force-directed graph
- 2-level: source wallets → deployer → drain wallets
- **Why:** Visualization = demo GOLD. Money flowing from 5 rugs to same wallet = instant "aha"
- **Pass:** Graph renders with nodes and edges for a known deployer

### WOW5: Telegram Bot Alerts
- Push RED alerts to Telegram via Bot API
- Users enter chat ID on dashboard → get instant DMs for dangerous tokens
- ~30 lines on top of existing maybeAlert()
- **Why:** Shows distribution beyond single dashboard. "Protects you wherever you are."
- **Pass:** RED token triggers Telegram message

---

## 🏁 Phase D: Submit (Feb 10-12)

### T6: Wallet graph (2-hop) — feeds into WOW4
- Already have helius.ts getDeployerHistory()
- Trace: deployer → incoming SOL transfers → source wallets → check if sources deployed RED tokens
- **Pass:** Known deployer returns funding graph

### T16: Demo video + Colosseum submission
- Record dashboard with live scanning
- Show: search bar, real-time detection, deployer profile, fund-flow graph
- Narrate with @AriaLinkwell voice
- Submit to Colosseum before Feb 12
- **Pass:** Video uploaded, project registered, submission confirmed

---

## 📊 Daily Schedule

### Each Evening Build Session:
1. Check BUILD-PLAN.md — what's next?
2. Fix bugs first (Phase A before Phase C)
3. Build 2-4 tasks per session
4. Git commit after each task
5. Push to GitHub at end of session

### Daily Research + Brainstorm (Scheduled Cron):
1. Research X/web for new scam detection ideas
2. Run Claude Code in plan mode to analyze codebase
3. Save findings to memory/solguard-brainstorm-YYYY-MM-DD.md
4. Identify new bugs, improvements, ideas
5. Update BUILD-PLAN.md if needed

---

## Research References
- `memory/solguard-brainstorm-feb3.md` — First brainstorm: 5 bugs, 5 WOW features, 3 dashboard upgrades
- `memory/solguard-research.md` — Competition analysis, zachxbt/samczsun gap, 80/20 Pareto
- BYDFi MoonX: Exchange-level honeypot detection (GoPlus, QuickIntel) — good UX reference
- DeepSnitch/SnitchScan: Whale tracking + real-time alerts across chains — concept reference  
- Zealynx: 45-check Solana security checklist from 50+ audits — risk factor reference
