const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'db', 'solguard.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

// Initialize DB
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

const BASE_URL = 'https://api.rugcheck.xyz';

// Inline risk calc (same as risk-engine.ts)
function calculateRisk(report, summary, deployerPreviousRugs = 0, deployerTotalTokens = 0) {
  const reasons = [];
  const breakdown = { deployer: 50, liquidity: 50, authority: 50, concentration: 50, rugcheck: 50 };
  const WEIGHTS = { deployer: 0.30, liquidity: 0.25, authority: 0.20, concentration: 0.15, rugcheck: 0.10 };

  if (deployerPreviousRugs > 0) {
    const rugRate = deployerTotalTokens > 0 ? deployerPreviousRugs / deployerTotalTokens : 1;
    breakdown.deployer = Math.max(0, Math.round((1 - rugRate) * 30));
    reasons.push(`Deployer rugged ${deployerPreviousRugs}/${deployerTotalTokens} tokens`);
  } else if (deployerTotalTokens === 0) {
    breakdown.deployer = 40;
    reasons.push('New deployer with no history');
  } else {
    breakdown.deployer = Math.min(100, 60 + deployerTotalTokens * 5);
  }

  if (summary) {
    const lpPct = summary.lpLockedPct || 0;
    if (lpPct >= 90) breakdown.liquidity = 95;
    else if (lpPct >= 50) breakdown.liquidity = 70;
    else if (lpPct >= 10) { breakdown.liquidity = 45; reasons.push(`LP ${lpPct.toFixed(1)}% locked`); }
    else { breakdown.liquidity = 10; reasons.push(`LP barely locked (${lpPct.toFixed(1)}%)`); }
  }

  if (report) {
    let authScore = 100;
    if (report.token.mintAuthority !== null) { authScore -= 40; reasons.push('Mint authority active'); }
    if (report.token.freezeAuthority !== null) { authScore -= 30; reasons.push('Freeze authority active'); }
    if (report.tokenMeta?.mutable) { authScore -= 15; reasons.push('Metadata mutable'); }
    breakdown.authority = Math.max(0, authScore);
  }

  if (report?.risks) {
    const cr = report.risks.filter(r => r.level === 'danger');
    if (cr.length > 0) { breakdown.concentration = Math.max(10, 50 - cr.length * 15); cr.forEach(r => reasons.push(`[DANGER] ${r.name}`)); }
    else breakdown.concentration = 70;
  }

  if (summary) {
    breakdown.rugcheck = Math.max(0, 100 - (summary.score_normalised || 0) * 10);
  }

  const score = Math.round(
    breakdown.deployer * WEIGHTS.deployer + breakdown.liquidity * WEIGHTS.liquidity +
    breakdown.authority * WEIGHTS.authority + breakdown.concentration * WEIGHTS.concentration +
    breakdown.rugcheck * WEIGHTS.rugcheck
  );

  let status = score <= 30 ? 'RED' : score <= 60 ? 'YELLOW' : 'GREEN';
  return { score: Math.max(0, Math.min(100, score)), status, reasons, breakdown };
}

async function scanToken(mint) {
  console.log(`\nScanning: ${mint}`);

  const [{ data: summary }, { data: report }] = await Promise.all([
    axios.get(`${BASE_URL}/v1/tokens/${mint}/report/summary`),
    axios.get(`${BASE_URL}/v1/tokens/${mint}/report`),
  ]);

  const risk = calculateRisk(report, summary, 0, 0);
  const name = report?.fileMeta?.name || 'Unknown';
  const symbol = report?.fileMeta?.symbol || '???';

  const insert = db.prepare(`INSERT OR REPLACE INTO tokens (mint, name, symbol, deployer, risk_score, lp_locked, lp_lock_duration, mint_authority_revoked, holder_count, top_holder_pct, status, risk_reasons, source, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
  insert.run(mint, name, symbol, report?.creator || 'unknown', risk.score, (summary?.lpLockedPct || 0) > 50 ? 1 : 0, 0, report?.token?.mintAuthority === null ? 1 : 0, 0, 0, risk.status, JSON.stringify(risk.reasons), 'scan-test');

  console.log(`${risk.status} | ${name} ($${symbol}) | Score: ${risk.score}/100`);
  risk.reasons.forEach(r => console.log(`  → ${r}`));
  return risk;
}

async function main() {
  console.log('=== SolGuard E2E Scan Test ===\n');

  // Real tokens to test
  const tokens = [
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',   // JUP
    'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',  // WIF (dogwifhat)
  ];

  for (const mint of tokens) {
    try {
      await scanToken(mint);
    } catch (e) {
      console.log(`Failed to scan ${mint}: ${e.message}`);
    }
    // Rate limit RugCheck
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n=== Database State ===');
  const all = db.prepare('SELECT mint, name, symbol, status, risk_score FROM tokens WHERE source = ?').all('scan-test');
  all.forEach(t => console.log(`  ${t.status} | ${t.name} ($${t.symbol}) — ${t.risk_score}/100`));

  console.log('\n✅ E2E scan test complete');
  db.close();
}

main().catch(console.error);
