# SolGuard Security Audit

**Auditor:** Aria Linkwell
**Date:** February 4, 2026
**Scope:** All source files in `src/`, `db/`, API routes
**Method:** Manual code review (Claude Code on Windows was non-functional)

---

## Critical Findings (0)

None found.

---

## High Findings (2)

### H-1: API routes have no authentication or rate limiting
**Files:** `src/app/api/scan/route.ts`, `src/app/api/tokens/route.ts`
**Severity:** High
**Description:** Both API endpoints are completely public with no auth, no API key requirement, and no rate limiting. The `/api/scan` endpoint triggers RugCheck + Helius API calls, which have their own rate limits. An attacker could:
1. Spam `/api/scan` to exhaust Helius API quota (free tier: limited requests)
2. Fill the SQLite database with junk scans via repeated POST requests
3. Trigger excessive X/Twitter alerts by scanning known RED tokens repeatedly

**Recommendation:**
- Add rate limiting (e.g., `next-rate-limit` or IP-based throttle)
- Add a cooldown per mint address (e.g., can't re-scan same token within 1 hour)
- Consider API key for programmatic access

### H-2: Environment variables exposed in client bundle risk
**Files:** `src/lib/scanner.ts:8-9`
**Severity:** High (if misconfigured)
**Description:** `HELIUS_API_KEY` is used in scanner.ts which runs server-side. However, if any client component accidentally imports from scanner.ts, the API key could leak to the browser. Currently safe because scanner.ts is only imported by API routes, but there's no `server-only` guard.

**Recommendation:**
- Add `import 'server-only'` at top of scanner.ts, helius.ts, alerts.ts, db.ts
- Install: `npm install server-only`
- This causes a build error if any client component tries to import these modules

---

## Medium Findings (5)

### M-1: No duplicate alert protection
**File:** `src/lib/alerts.ts:127`
**Severity:** Medium
**Description:** `maybeAlert()` posts a tweet every time it's called for a qualifying token. If the same token is scanned multiple times (e.g., via the search bar), it posts duplicate tweets. The `insertAlert` DB call doesn't prevent this.

**Recommendation:**
- Check if an alert already exists for this mint before posting:
  ```typescript
  const existing = db.prepare('SELECT 1 FROM alerts WHERE token_mint = ?').get(mint);
  if (existing) return false;
  ```

### M-2: Scanner skips tokens but search bar doesn't re-scan
**File:** `src/lib/scanner.ts:28-32`
**Severity:** Medium
**Description:** `scanToken()` returns null immediately if a token already exists in DB (`getTokenByMint`). This means token risk scores are NEVER updated. A token could change from RED to GREEN (LP locked after launch) or GREEN to RED (LP removed), but SolGuard would show stale data forever.

**Recommendation:**
- Add a `rescan` parameter or TTL-based refresh (e.g., rescan if last scan > 1 hour)
- The search bar API already handles cached results, but should offer a "force rescan" option

### M-3: extractMintFromLogs is unreliable
**File:** `src/lib/scanner.ts:92-103`
**Severity:** Medium
**Description:** The regex-based log parsing (`extractMintFromLogs`) looks for `InitializeMint` or `MintTo` strings and extracts the first base58 match. This is fragile:
1. pump.fun may not include these exact strings
2. The regex could match account addresses that aren't the mint
3. The fallback (transaction fetch + postTokenBalances diff) is more reliable but slower

**Recommendation:**
- Swap priority: use the transaction fetch approach as primary, log parsing as optimization
- Or use Helius webhooks for pump.fun events (more reliable than raw log parsing)

### M-4: OAuth signature doesn't include request body
**File:** `src/lib/alerts.ts:36-51`
**Severity:** Medium
**Description:** The OAuth 1.0a signature generation only signs the OAuth params, not the request body (`{ text: ... }`). Per OAuth 1.0a spec, POST body parameters should be included in the signature base string when Content-Type is `application/x-www-form-urlencoded`. However, since X API v2 uses `application/json`, the body is NOT included in the signature per spec. This is actually correct for JSON payloads, but the implementation should document this explicitly.

**Recommendation:**
- Add a code comment explaining why body is excluded from signature (JSON content type)
- Consider using a battle-tested OAuth library (e.g., `oauth-1.0a`) instead of hand-rolling

### M-5: Database not cleaned up on app shutdown
**File:** `src/lib/db.ts`
**Severity:** Medium
**Description:** The SQLite connection uses WAL mode but has no graceful shutdown handler. If the process crashes mid-write, WAL files could be left in an inconsistent state. Also, `better-sqlite3` connections should be closed with `db.close()` on exit.

**Recommendation:**
```typescript
process.on('SIGTERM', () => { if (db) db.close(); });
process.on('SIGINT', () => { if (db) db.close(); });
```

---

## Low Findings (6)

### L-1: No input sanitization on token name/symbol display
**File:** `src/app/page.tsx` (TokenRow, TokenCard)
**Severity:** Low
**Description:** Token names and symbols from RugCheck are rendered directly in JSX. React auto-escapes by default, so XSS is prevented. However, token names could contain misleading Unicode (homoglyph attacks, RTL override characters) that make the UI confusing.

**Recommendation:**
- Strip non-printable and RTL override characters from display names
- Truncate excessively long names (currently shows full name)

### L-2: Deployer history lookup doesn't paginate
**File:** `src/lib/scanner.ts:60-62`, `src/lib/helius.ts:99`
**Severity:** Low
**Description:** `getDeployerHistory()` fetches only one page of transactions from Helius. Prolific deployers (100+ tokens) would have incomplete history, leading to under-counting `deployerTotalTokens`.

**Recommendation:**
- Add pagination loop with cursor/before parameter
- Or document limitation and note that deployer score is conservative for prolific deployers

### L-3: Token age calculation assumes Helius returns matching mint TX
**File:** `src/lib/scanner.ts:72-76`
**Severity:** Low
**Description:** `tokenAgeSec` is only set if a TOKEN_MINT transaction is found where `tokenTransfers` includes the target mint. If Helius doesn't return token transfers for the mint creation TX (possible for some token types), `tokenAgeSec` stays 0 and defaults to the "unknown age" penalty (score 20).

**Recommendation:**
- Fallback: use the transaction timestamp of the earliest TX from the deployer as a rough age proxy
- Or query the token account creation time directly

### L-4: No CORS headers on API routes
**Files:** `src/app/api/scan/route.ts`, `src/app/api/tokens/route.ts`
**Severity:** Low
**Description:** No explicit CORS configuration. Next.js defaults allow same-origin only, which is fine for the dashboard. But if we want third-party integrations (Telegram bot, other frontends), CORS headers would be needed.

**Recommendation:**
- Fine for MVP. Add CORS when external consumers are needed.

### L-5: Schema uses TEXT for dates instead of INTEGER
**File:** `db/schema.sql`
**Severity:** Low
**Description:** `created_at` and `updated_at` use `TEXT DEFAULT (datetime('now'))`. SQLite date functions work with text, but INTEGER (Unix timestamp) is faster for sorting and comparisons.

**Recommendation:**
- Low priority. Text dates work fine at current scale. Consider migration to INTEGER timestamps if performance becomes an issue.

### L-6: Test coverage is minimal
**File:** `src/lib/risk-engine.test.ts`
**Severity:** Low
**Description:** Only 1 test case covering the happy path (GREEN token). No tests for:
- RED tokens (deployer with rugs)
- YELLOW tokens (mint authority active)
- Edge cases (null report, null summary, both null)
- Score capping overrides
- Token age boundaries

**Recommendation:**
- Add test cases for each risk tier and override condition
- Add integration test for `/api/scan` endpoint

---

## Informational

### I-1: `console.log` used for logging
Production apps should use structured logging (e.g., pino, winston). Console.log is fine for hackathon MVP.

### I-2: No error boundary in React
If the dashboard crashes (e.g., malformed JSON in risk_breakdown), the whole page goes white. Add an error boundary component.

### I-3: `getDb()` singleton could cause issues in serverless
On Vercel (serverless), each function invocation may get a fresh process. The singleton `db` variable works for local dev but not serverless. This will be addressed by the Turso migration.

---

## Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 0 | - |
| High | 2 | No rate limiting on APIs, server-only guard missing |
| Medium | 5 | Duplicate alerts, stale data, fragile log parsing |
| Low | 6 | Display sanitization, pagination, test coverage |
| Info | 3 | Logging, error boundary, serverless singleton |

**Overall Assessment:** Solid for a hackathon MVP. No critical vulnerabilities. The two High findings (rate limiting and server-only imports) should be addressed before production use. The codebase is clean, well-structured, and the risk engine logic is sound.
