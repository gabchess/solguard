---
name: SolGuard Brainstorm
overview: Analyze current src architecture and propose fast, high-impact options for autonomous token ingestion, scoring accuracy upgrades, and judge-facing demo features without implementing code yet.
todos:
  - id: rank-autofeeds
    content: Compare token source options (DexScreener/Jupiter/Birdeye/pump.fun alternatives) by speed to ship, dependency friction, and expected token quality.
    status: pending
  - id: score-upgrades
    content: Design 3-5 high-signal scoring additions with concrete formulas, kill-switch thresholds, and data source feasibility.
    status: pending
  - id: demo-wow-priorities
    content: Select the strongest 60-second demo story with a minimal feature set and clear sequence for judges.
    status: pending
isProject: false
---

# SolGuard Analysis and Hackathon Strategy

## Current System Snapshot

- Token intake is currently manual via `POST /api/scan` and UI search in `[/Users/gava/solguard/src/app/page.tsx]( /Users/gava/solguard/src/app/page.tsx )`.
- There is a pump.fun live scanner in `[/Users/gava/solguard/src/lib/scanner.ts]( /Users/gava/solguard/src/lib/scanner.ts )` but it hard-depends on `HELIUS_API_KEY` and is not currently invoked anywhere in `src/`.
- Risk scoring is in `[/Users/gava/solguard/src/lib/risk-engine.ts]( /Users/gava/solguard/src/lib/risk-engine.ts )` with weighted factors, pump.fun weight overrides, and kill switches already in place.
- Dashboard already supports “live feel” via polling `/api/tokens` every 15s in `[/Users/gava/solguard/src/app/page.tsx]( /Users/gava/solguard/src/app/page.tsx )`.

## Recommended Direction (No Build Yet)

1. Rank auto-feed sources by implementation speed and reliability for Feb 12 deadline.
2. Add pragmatic scoring signals that fit current DB and API shape with minimal schema churn.
3. Prioritize 1-2 demo “wow” moments that reuse existing pages/components.

## Candidate Ingestion Architecture

```mermaid
flowchart LR
    tokenFeed[TokenFeedSource]
    queue[ScanQueue]
    scanner[scanToken]
    risk[riskEngine]
    db[tokensTable]
    dashboard[dashboardPoll15s]

    tokenFeed --> queue
    queue --> scanner
    scanner --> risk
    risk --> db
    db --> dashboard
```



## Key Files To Leverage

- `[/Users/gava/solguard/src/lib/scanner.ts]( /Users/gava/solguard/src/lib/scanner.ts )` for queueing/scanning logic and scanner status state.
- `[/Users/gava/solguard/src/lib/risk-engine.ts]( /Users/gava/solguard/src/lib/risk-engine.ts )` for extending scoring and kill-switch logic.
- `[/Users/gava/solguard/src/lib/db.ts]( /Users/gava/solguard/src/lib/db.ts )` for storing any additional telemetry used by score/demo surfaces.
- `[/Users/gava/solguard/src/app/page.tsx]( /Users/gava/solguard/src/app/page.tsx )` and `[/Users/gava/solguard/src/components/ScannerStatus.tsx]( /Users/gava/solguard/src/components/ScannerStatus.tsx )` for visible judge-facing real-time UX.

