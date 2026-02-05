# SolGuard Security & Code Audit — Feb 5, 2026
## Audited by Claude Code

### CRITICAL / HIGH SEVERITY

| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|
| **H-1** | `src/lib/db.ts:11-62` | Race condition on schema initialization — errors swallowed on line 59-61 | Make schema init error throw or retry |
| **H-2** | `src/lib/db.ts:70` | SQL Injection risk via `executeQuery` — ensure all user values go through args | Audit all callers |
| **H-3** | `src/app/api/scan/route.ts:28` | Unvalidated JSON parsing — can throw 500 instead of 400 | Wrap in try-catch |
| **H-4** | `src/lib/scanner.ts:61-64` | Deployer from external API could contain malicious chars | Validate base58 before query |

### MEDIUM SEVERITY

| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|
| **M-1** | `src/lib/db.ts:166-180` | Deprecated `getDb()` returns sync-looking API | Remove shim or throw |
| **M-2** | `src/app/api/scan/route.ts:67-75` | Alert payload missing name/symbol/deployer | Fetch from DB first |
| **M-3** | `src/app/page.tsx:218-219` | JSON.parse without try-catch — can crash | Add try-catch with fallback |
| **M-4** | `src/lib/scanner.ts:183-207` | setTimeout without cleanup | Track pending timeouts |
| **M-5** | `src/lib/alerts.ts:144-147` | Race condition on duplicate alert check | Use INSERT ON CONFLICT |
| **M-6** | `src/lib/scanner.ts:28-32` | TOCTOU race on token existence check | Use INSERT OR IGNORE |
| **M-7** | `src/app/page.tsx:357` | Potential crash on empty deployer | Add null check |

### LOW SEVERITY

| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|
| **L-1** | `src/lib/db.ts:6` | Fallback to local file path won't work on Vercel | Require env var in prod |
| **L-2** | `src/lib/scanner.ts:8` | Hardcoded pump.fun program ID | Move to config |
| **L-3** | `src/lib/doc-links.ts:65-68` | First-match keyword wins | Consider all matches |
| **L-4** | `src/app/api/scan/route.ts:18-19` | IP extraction fallback to 'unknown' | Parse first IP |
| **L-5** | `src/lib/scanner.ts:252` | Subscription listener not tracked | Export cleanup function |
| **L-6** | `src/lib/risk-engine.ts:81` | Comment says 20% but weight is 15% | Fix comment |
| **L-7** | `src/app/page.tsx:316` | isNew check uses client time | Accept minor UX issue |
| **L-8** | `src/lib/alerts.ts:131` | Tweet truncation cuts mid-word | Truncate at last space |
| **L-9** | `src/types/index.ts:7-9` | Type mismatch: lp_locked is number should be boolean | Fix type |
| **L-10** | `src/lib/scanner.ts:142-146` | Regex for Solana address is loose | Use base58 validation |

### INFO

| # | File:Line | Issue |
|---|-----------|-------|
| **I-1** | `src/lib/db.ts:59` | Catch might be masking other errors |
| **I-2** | `src/app/layout.tsx:39` | Footer still says "Built by Aria Linkwell" |
| **I-3** | `src/lib/scanner.ts:13-14` | Module-level mutable state could misbehave in serverless |

---

## Most Urgent Fixes

1. **H-3** — JSON parse error handling in API
2. **M-3** — JSON parse in UI
3. **M-7** — Null deployer crash

## Summary

- 4 High, 7 Medium, 10 Low, 3 Info
- Code is functional but has edge cases that could cause crashes
- No critical security vulnerabilities found (SQL injection is mitigated by parameterized queries)
