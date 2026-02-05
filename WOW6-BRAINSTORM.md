# WOW6: Solana Docs Integration — Brainstorm

## The Feature
Add "Learn more" links next to risk reasons that link to official Solana documentation, helping users understand WHY something is risky.

## Solana's LLM-Ready Docs
- Add `.md` to any URL: `solana.com/docs/core/tokens.md`
- Returns markdown, perfect for LLMs or displaying snippets
- Source: https://x.com/solana_devs/status/2019123339642695783

## Risk Reasons → Doc Mappings

### Authority Risks (most educational value)
| Risk Reason | Solana Doc URL |
|-------------|----------------|
| "Mint authority is active — new tokens can be minted" | https://solana.com/docs/core/tokens.md#mint-authority |
| "Freeze authority is active — your tokens can be frozen" | https://solana.com/docs/core/tokens.md#freeze-authority |
| "Token metadata is mutable" | https://solana.com/docs/core/tokens.md#token-metadata |

### Liquidity Risks
| Risk Reason | Doc/Resource |
|-------------|--------------|
| "LP barely locked" / "LP not locked" | Could link to Raydium docs or a custom explainer |
| "Could not verify LP lock status" | Same as above |

### Deployer Risks
| Risk Reason | Doc/Resource |
|-------------|--------------|
| "Deployer rugged X previous tokens" | Custom explainer (no Solana doc for this) |
| "New deployer with no token history" | Custom explainer |

### Age Risks
| Risk Reason | Doc/Resource |
|-------------|--------------|
| "Token is less than X old" | Custom explainer about rug timing patterns |

## Implementation Options

### Option A: Static Mapping (Simple, Fast)
```typescript
const DOC_LINKS: Record<string, string> = {
  'mint authority': 'https://solana.com/docs/core/tokens.md#mint-authority',
  'freeze authority': 'https://solana.com/docs/core/tokens.md#freeze-authority',
  'metadata': 'https://solana.com/docs/core/tokens.md#token-metadata',
};

function getDocLink(reason: string): string | null {
  for (const [keyword, url] of Object.entries(DOC_LINKS)) {
    if (reason.toLowerCase().includes(keyword)) return url;
  }
  return null;
}
```

### Option B: Fetch Doc Snippets (Richer UX)
- Fetch the .md URL at build time or on-demand
- Parse and extract relevant section
- Show tooltip/modal with actual doc content
- **Pros:** Educational, impressive demo
- **Cons:** More complex, adds latency

### Option C: Hybrid (Recommended)
- Static links for most items
- Pre-cached snippets for key terms (mint authority, freeze authority)
- Show in a modal when user clicks "Learn more"

## UI Placement

### Token Detail View (Primary)
- Each risk reason gets a small "?" or "📖" icon
- Clicking opens modal with doc snippet or links to Solana docs
- Example:
  ```
  ⚠️ Mint authority is active — new tokens can be minted [📖]
  ```

### Risk Breakdown Section
- Under each category (Authority, Liquidity, etc.)
- "What does this mean?" expandable section

## Demo Script
"SolGuard doesn't just flag risks — it teaches you. Click any warning to see official Solana documentation explaining exactly why this matters. The AI reads Solana's own docs in real-time."

## Files to Modify
1. `src/lib/doc-links.ts` — New file with mapping + fetch logic
2. `src/app/page.tsx` — Add Learn More links/icons to risk reasons
3. `src/components/DocModal.tsx` — New component for showing doc content

## Priority
- **Must have:** Static links to Solana docs (Option A)
- **Nice to have:** Fetched snippets in modal (Option B)
- **Stretch:** AI-generated explanations using doc context

## Quick Win for Hackathon
Just implement Option A with visible links. Judges will see we're:
1. Educating users, not just warning them
2. Using official sources
3. Treating security as a learning opportunity

## Estimated Time
- Option A (links only): 30 minutes
- Option B (with modal): 1-2 hours
- Option C (hybrid): 2-3 hours
