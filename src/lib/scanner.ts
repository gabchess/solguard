import 'server-only';
import { Connection, PublicKey } from '@solana/web3.js';
import { getTokenSummary, getTokenReport } from './rugcheck';
import { calculateRisk } from './risk-engine';
import { insertToken, insertScan, getTokenByMint, executeQuery } from './db';
import { getDeployerHistory } from './helius';

const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';
const WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

let reconnectAttempts = 0;
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;
const MAX_RECONNECT_DELAY = 60000; // 60s max

/**
 * Scan a single token: RugCheck + risk engine + save to DB.
 */
export async function scanToken(mint: string): Promise<{
  mint: string;
  score: number;
  status: 'RED' | 'YELLOW' | 'GREEN';
  reasons: string[];
} | null> {
  try {
    // Skip if already scanned
    const existing = await getTokenByMint(mint);
    if (existing) {
      console.log(`[SCANNER] Already scanned: ${mint}`);
      return null;
    }

    console.log(`[SCANNER] Scanning token: ${mint}`);

    // Get RugCheck data
    const [summary, report] = await Promise.all([
      getTokenSummary(mint),
      getTokenReport(mint),
    ]);

    if (!summary && !report) {
      console.log(`[SCANNER] No RugCheck data for ${mint} — skipping`);
      return null;
    }

    // Get deployer history for risk scoring
    const deployer = report?.creator || 'unknown';
    let deployerPreviousRugs = 0;
    let deployerTotalTokens = 0;
    let tokenAgeSec = 0;

    if (deployer !== 'unknown') {
      try {
        const history = await getDeployerHistory(deployer);
        // Count TOKEN_MINT transactions (each = a token this deployer created)
        const mintTxs = history.filter(tx => tx.type === 'TOKEN_MINT');
        deployerTotalTokens = mintTxs.length;

        // Check how many of deployer's previous tokens scored RED in our DB
        const redCountResult = await executeQuery(
          "SELECT COUNT(*) as count FROM tokens WHERE deployer = ? AND status = 'RED' AND mint != ?",
          [deployer, mint]
        );
        deployerPreviousRugs = Number(redCountResult.rows[0]?.count ?? 0);

        // Get token age from the earliest mint tx for THIS token
        const thisMintTx = mintTxs.find(tx =>
          tx.tokenTransfers?.some(t => t.mint === mint)
        );
        if (thisMintTx) {
          tokenAgeSec = Math.floor(Date.now() / 1000) - thisMintTx.timestamp;
        }

        console.log(`[SCANNER] Deployer ${deployer.slice(0, 8)}...: ${deployerTotalTokens} tokens, ${deployerPreviousRugs} rugs`);
      } catch (err) {
        console.error(`[SCANNER] Deployer history error:`, err);
      }
    }

    // Run risk engine with real deployer data
    const risk = calculateRisk(report, summary, deployerPreviousRugs, deployerTotalTokens, tokenAgeSec);

    // Extract token info
    const name = report?.fileMeta?.name || report?.tokenMeta?.name || 'Unknown';
    const symbol = report?.fileMeta?.symbol || report?.tokenMeta?.symbol || '???';

    // Save to database
    await insertToken({
      mint,
      name,
      symbol,
      deployer,
      risk_score: risk.score,
      lp_locked: (summary?.lpLockedPct || 0) > 50,
      lp_lock_duration: 0,
      mint_authority_revoked: report?.token?.mintAuthority === null,
      holder_count: 0,
      top_holder_pct: 0,
      status: risk.status,
      risk_reasons: risk.reasons,
      risk_breakdown: risk.breakdown,
      source: 'pump.fun',
    });

    // Save scan result
    await insertScan(mint, 'rugcheck', JSON.stringify({
      score: summary?.score,
      score_normalised: summary?.score_normalised,
      lpLockedPct: summary?.lpLockedPct,
      risks: summary?.risks || [],
    }));

    console.log(`[SCANNER] ${risk.status} | ${name} ($${symbol}) | Score: ${risk.score}/100`);
    if (risk.reasons.length > 0) {
      risk.reasons.forEach(r => console.log(`  → ${r}`));
    }

    return {
      mint,
      score: risk.score,
      status: risk.status,
      reasons: risk.reasons,
    };
  } catch (err) {
    console.error(`[SCANNER] Error scanning ${mint}:`, err);
    return null;
  }
}

/**
 * Parse mint address from pump.fun transaction logs.
 * pump.fun creates tokens — the mint is in the instruction accounts.
 */
function extractMintFromLogs(logs: string[]): string | null {
  // Look for "Program log: " entries that reference mint creation
  for (const log of logs) {
    // pump.fun logs typically contain the mint address in instruction data
    // The mint is the first account in the token creation instruction
    if (log.includes('InitializeMint') || log.includes('MintTo')) {
      // Extract the address from surrounding context
      const match = log.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/);
      if (match) return match[1];
    }
  }
  return null;
}

/**
 * Start the WebSocket scanner listening for pump.fun events.
 */
export function startScanner(): void {
  if (!HELIUS_API_KEY) {
    console.error('[SCANNER] HELIUS_API_KEY not set — cannot start scanner');
    return;
  }

  console.log('[SCANNER] Starting pump.fun token scanner...');
  console.log(`[SCANNER] Monitoring program: ${PUMP_FUN_PROGRAM}`);

  const connection = new Connection(RPC_URL, {
    wsEndpoint: WS_URL,
  });

  const programId = new PublicKey(PUMP_FUN_PROGRAM);

  // Subscribe to logs mentioning pump.fun program
  const subscriptionId = connection.onLogs(
    programId,
    async (logInfo) => {
      try {
        const { signature, logs } = logInfo;
        
        if (logInfo.err) return; // Skip failed transactions

        console.log(`[SCANNER] New pump.fun tx: ${signature}`);

        // Try to extract mint from logs
        const mint = extractMintFromLogs(logs);
        
        if (mint) {
          // Rate limit: wait a bit for RugCheck to have data
          setTimeout(() => {
            scanToken(mint).catch(err => console.error('[SCANNER] Scan error:', err));
          }, 5000);
        } else {
          // Fallback: fetch the transaction to get accounts
          try {
            const tx = await connection.getParsedTransaction(signature, {
              maxSupportedTransactionVersion: 0,
            });
            
            if (tx?.meta && !tx.meta.err) {
              // Look for new token mints in the transaction's post-token-balances
              const postBalances = tx.meta.postTokenBalances || [];
              const preBalances = tx.meta.preTokenBalances || [];
              
              // Find mints that appear in post but not pre (new tokens)
              const preMints = new Set(preBalances.map(b => b.mint));
              const newMints = postBalances
                .filter(b => !preMints.has(b.mint))
                .map(b => b.mint);
              
              for (const newMint of newMints) {
                setTimeout(() => {
                  scanToken(newMint).catch(err => console.error('[SCANNER] Scan error:', err));
                }, 5000);
              }
            }
          } catch {
            // Transaction fetch failed — skip
          }
        }
      } catch (err) {
        console.error('[SCANNER] Error processing log:', err);
      }
    },
    'confirmed',
  );

  console.log(`[SCANNER] Subscribed (ID: ${subscriptionId})`);

  // Handle connection close / reconnect
  connection.onSlotChange(() => {
    // Reset reconnect counter on successful communication
    reconnectAttempts = 0;
  });

  // Clear any previous health check interval to prevent stacking
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  // Reconnection logic (handled by @solana/web3.js internally,
  // but we add a heartbeat check)
  healthCheckInterval = setInterval(async () => {
    try {
      const slot = await connection.getSlot();
      console.log(`[SCANNER] Health check OK — slot: ${slot}`);
      reconnectAttempts = 0;
    } catch {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
      console.error(`[SCANNER] Connection lost — reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})`);
      
      if (reconnectAttempts > 10) {
        console.error('[SCANNER] Too many reconnection attempts — restarting scanner');
        if (healthCheckInterval) {
          clearInterval(healthCheckInterval);
          healthCheckInterval = null;
        }
        try { connection.removeOnLogsListener(subscriptionId); } catch {}
        setTimeout(() => startScanner(), delay);
        return;
      }
    }
  }, 30000); // Check every 30s
}
