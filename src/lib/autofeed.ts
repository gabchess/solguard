import 'server-only';
import { scanToken } from './scanner';
import { getTokenByMint } from './db';

const DEXSCREENER_API = 'https://api.dexscreener.com';
const POLL_INTERVAL_MS = 60_000; // Poll every 60 seconds
const MAX_CONCURRENT_SCANS = 2;
const SCAN_DELAY_MS = 3_000; // Delay between scans to avoid rate limits

let isRunning = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let totalFed = 0;
let lastPollTime: string | null = null;

interface DexScreenerPair {
  chainId: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  pairCreatedAt?: number;
  liquidity?: { usd: number };
  volume?: { h24: number };
  fdv?: number;
}

export function getAutofeedStatus() {
  return {
    running: isRunning,
    totalFed,
    lastPoll: lastPollTime,
  };
}

/**
 * Fetch latest Solana token pairs from DexScreener.
 * No API key needed.
 */
async function fetchNewSolanaTokens(): Promise<string[]> {
  try {
    // Get latest token profiles (boosted/trending)
    const res = await fetch(`${DEXSCREENER_API}/token-profiles/latest/v1`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error(`[AUTOFEED] DexScreener API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    
    // Filter for Solana tokens only
    const solanaTokens = (data as Array<{ chainId: string; tokenAddress: string }>)
      .filter((t) => t.chainId === 'solana')
      .map((t) => t.tokenAddress)
      .filter((addr) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr));

    console.log(`[AUTOFEED] Found ${solanaTokens.length} Solana tokens from DexScreener`);
    return solanaTokens;
  } catch (err) {
    console.error(`[AUTOFEED] Fetch error:`, err);
    return [];
  }
}

/**
 * Also fetch trending/recently boosted tokens for variety.
 */
async function fetchBoostedTokens(): Promise<string[]> {
  try {
    const res = await fetch(`${DEXSCREENER_API}/token-boosts/latest/v1`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const solanaTokens = (data as Array<{ chainId: string; tokenAddress: string }>)
      .filter((t) => t.chainId === 'solana')
      .map((t) => t.tokenAddress)
      .filter((addr) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr));

    console.log(`[AUTOFEED] Found ${solanaTokens.length} boosted Solana tokens`);
    return solanaTokens;
  } catch {
    return [];
  }
}

/**
 * Process a batch of mints: skip cached, scan new ones with rate limiting.
 */
async function processMints(mints: string[]): Promise<void> {
  // Deduplicate
  const unique = [...new Set(mints)];
  
  // Filter out already-scanned tokens
  const toScan: string[] = [];
  for (const mint of unique) {
    const existing = await getTokenByMint(mint);
    if (!existing) {
      toScan.push(mint);
    }
  }

  if (toScan.length === 0) {
    console.log(`[AUTOFEED] No new tokens to scan`);
    return;
  }

  console.log(`[AUTOFEED] Scanning ${toScan.length} new tokens (${unique.length - toScan.length} cached)`);

  // Process with concurrency limit
  let active = 0;
  let index = 0;

  const scanNext = async (): Promise<void> => {
    while (index < toScan.length) {
      if (active >= MAX_CONCURRENT_SCANS) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      const mint = toScan[index++];
      active++;

      scanToken(mint)
        .then((result) => {
          if (result) {
            totalFed++;
            console.log(`[AUTOFEED] Scanned ${result.status} | ${mint.slice(0, 8)}... | Score: ${result.score}`);
          }
        })
        .catch((err) => {
          console.error(`[AUTOFEED] Scan failed for ${mint}:`, err);
        })
        .finally(() => {
          active--;
        });

      // Delay between starting scans
      await new Promise(r => setTimeout(r, SCAN_DELAY_MS));
    }

    // Wait for all active scans to complete
    while (active > 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  };

  await scanNext();
}

/**
 * Run one poll cycle: fetch tokens from all sources, scan new ones.
 */
async function pollCycle(): Promise<void> {
  console.log(`[AUTOFEED] Starting poll cycle...`);
  lastPollTime = new Date().toISOString();

  try {
    // Fetch from multiple sources in parallel
    const [profileTokens, boostedTokens] = await Promise.all([
      fetchNewSolanaTokens(),
      fetchBoostedTokens(),
    ]);

    // Combine all sources
    const allMints = [...profileTokens, ...boostedTokens];
    
    if (allMints.length > 0) {
      // Limit to 10 per cycle to avoid hammering RugCheck
      const batch = allMints.slice(0, 10);
      await processMints(batch);
    }
  } catch (err) {
    console.error(`[AUTOFEED] Poll cycle error:`, err);
  }
}

/**
 * Start the auto-feed poller.
 * Safe to call multiple times (idempotent).
 */
export function startAutofeed(): void {
  if (isRunning) {
    console.log(`[AUTOFEED] Already running`);
    return;
  }

  console.log(`[AUTOFEED] Starting DexScreener auto-feed (every ${POLL_INTERVAL_MS / 1000}s)`);
  isRunning = true;

  // Run first cycle immediately
  pollCycle().catch(console.error);

  // Then poll on interval
  pollTimer = setInterval(() => {
    pollCycle().catch(console.error);
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the auto-feed poller.
 */
export function stopAutofeed(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isRunning = false;
  console.log(`[AUTOFEED] Stopped`);
}
