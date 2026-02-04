# SolGuard Security Audit — Claude Code Findings

**Tool:** Claude Code CLI (plan mode failed, default mode worked)
**Date:** February 4, 2026
**Method:** Two focused passes: (1) risk-engine + scanner, (2) API routes + frontend + alerts + db + rugcheck

---

## Pass 1: risk-engine.ts + scanner.ts (19 findings)

### HIGH (5)

1. **Weight/comment mismatch in risk-engine** (risk-engine.ts:16-24,81,106) — Comments say authority=20%, concentration=15% but actual weights are 15% and 10%. Misleading for anyone tuning the engine.

2. **deployerPreviousRugs can exceed deployerTotalTokens** (risk-engine.ts:49-52) — Independent data sources (local DB vs Helius API). rugRate can exceed 1.0, producing negative input. Math.max(0,...) saves the score but it's a silent data integrity issue.

3. **API key leaked in WebSocket URL at module scope** (scanner.ts:10-11) — WS_URL/RPC_URL computed at import time. Error stack traces or debug logs could leak the key.

4. **Race condition: scanToken skip-if-exists not atomic** (scanner.ts:28-32) — Two concurrent calls for same mint can both pass the existence check, causing duplicate scans and potential duplicate DB inserts.

5. **extractMintFromLogs regex too permissive** (scanner.ts:142) — Matches first Base58 string 32-44 chars, could match program IDs or signers instead of the actual mint.

### MEDIUM (6)

6. **Duplicate danger-level reasons** (risk-engine.ts:109-121,152-157) — Concentration risks can appear twice (once plain, once with [DANGER] prefix). Set dedup won't catch different strings.

7. **scanToken returns null for both skip and error** (scanner.ts:29-32) — Callers can't distinguish "already scanned" from "scan failed."

8. **Deployer fallback 'unknown' aggregates unrelated tokens** (scanner.ts:48,93) — All unknown deployers share the same DB key.

9. **onSlotChange as health signal is unreliable** (scanner.ts:224-227) — Slot changes come over different subscription, log sub could be dead while slots still arrive.

10. **No backpressure on scan timeouts** (scanner.ts:183-184,205-207) — High volume creates unbounded concurrent scanToken calls after 5s delay.

11. **Recursive startScanner with no max restart count** (scanner.ts:253) — Infinite restart loop with no global guard.

### LOW (8)

12. tokenAgeSec can be negative (clock skew)
13. 8 clean tokens = perfect 100 deployer score (too generous)
14. lpLockedPct could be string type from API
15. No validation of report.risks element shape
16. PUMP_FUN_PROGRAM hardcoded (migration risk)
17. lp_lock_duration always 0 (dead field)
18. source hardcoded to 'pump.fun' even for manual scans
19. No input validation on mint parameter in scanToken

---

## Pass 2: API routes + frontend + alerts + db + rugcheck (26 findings)

### HIGH (3)

1. **Rate limit bypass via spoofed X-Forwarded-For** (scan/route.ts:18) — Trivially spoofable header. Need trusted IP source.

2. **HMAC-SHA1 for OAuth** (alerts.ts:49) — Weak hash, but mandated by X API v1.0a spec. Not actionable.

3. **Schema file read from process.cwd() at runtime** (db.ts:24-25) — Fragile for deployment, crashes on wrong cwd.

### MEDIUM (10)

4. Rate limiter Map leaks memory unboundedly (scan/route.ts:7-8)
5. Alert payload passes empty name/symbol/deployer (scan/route.ts:67-75)
6. API secrets fallback to empty strings, no startup validation (alerts.ts:7-10)
7. Unsafe error type narrowing throughout (alerts.ts:104-106, rugcheck.ts:62-63)
8. Tweet truncation can split multi-byte emoji (alerts.ts:131)
9. Module-level DB singleton not safe under Next.js HMR (db.ts:9)
10. Silent catch on ALTER TABLE migration swallows all errors (db.ts:28-32)
11. User-controlled mint interpolated into URL paths (rugcheck.ts:58,76,94)
12. JSON.parse on potentially malformed data crashes component (page.tsx:217-218)
13. token.deployer.slice() crashes if deployer is null (page.tsx:334)
14. No auth on /api/tokens (tokens/route.ts:4-6)

### LOW (12)

15. Race condition: token may not exist in DB after scanToken returns (scan/route.ts:78)
16. Base58 regex allows some non-Solana addresses (scan/route.ts:38)
17. Failed alerts permanently suppressed by dedup (alerts.ts:156-162)
18. INSERT OR REPLACE resets created_at timestamp (db.ts:56)
19. AVG(risk_score) returns NULL on empty table (db.ts:91)
20. Hardcoded 100-row limit, no pagination (tokens/route.ts:6)
21. Date.now() - new Date(null) produces NaN-like behavior (page.tsx:293,332)
22. No guard on res.json() failure (page.tsx:59)
23. Unsafe type assertion on status (page.tsx:14)
24. No API key for RugCheck (rugcheck.ts:3)
25. Unsafe error type narrowing in rugcheck.ts
26. Polling continues when tab hidden (page.tsx:395-398)

### INFO (1)

27. Polling interval should pause on hidden tab (page.tsx)

---

## Combined Summary

| Severity | Aria's Audit | Claude Code | Unique New |
|----------|-------------|-------------|------------|
| Critical | 0 | 0 | 0 |
| High | 2 | 8 | ~5 new |
| Medium | 5 | 16 | ~10 new |
| Low | 6 | 20 | ~12 new |

## Top Priority Fixes for Tomorrow

1. **Fix race condition in scanToken** — Add mutex/lock or INSERT ON CONFLICT
2. **Fix empty alert payload** — Pass actual name/symbol from scan result
3. **Fix failed alert permanent suppression** — Only insert alert to DB if tweet succeeded
4. **Fix JSON.parse crash** — Add try/catch around risk_reasons/risk_breakdown parsing
5. **Fix deployer null crash** — Add null guard on token.deployer
6. **Fix weight/comment mismatch** — Update comments to match actual weights
7. **Add scan queue with backpressure** — Rate limit concurrent scanToken calls
