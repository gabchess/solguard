const axios = require('axios');

const BASE_URL = 'https://api.rugcheck.xyz';

// Inline risk calculation for testing (mirrors risk-engine.ts logic)
function calculateRisk(report, summary, deployerPreviousRugs = 0, deployerTotalTokens = 0) {
  const reasons = [];
  const breakdown = { deployer: 50, liquidity: 50, authority: 50, concentration: 50, rugcheck: 50 };
  const WEIGHTS = { deployer: 0.30, liquidity: 0.25, authority: 0.20, concentration: 0.15, rugcheck: 0.10 };

  // Deployer
  if (deployerPreviousRugs > 0) {
    const rugRate = deployerTotalTokens > 0 ? deployerPreviousRugs / deployerTotalTokens : 1;
    breakdown.deployer = Math.max(0, Math.round((1 - rugRate) * 30));
    reasons.push(`Deployer rugged ${deployerPreviousRugs} of ${deployerTotalTokens} previous tokens`);
  } else if (deployerTotalTokens === 0) {
    breakdown.deployer = 40;
    reasons.push('New deployer with no token history');
  } else {
    breakdown.deployer = Math.min(100, 60 + deployerTotalTokens * 5);
  }

  // Liquidity
  if (summary) {
    const lpPct = summary.lpLockedPct || 0;
    if (lpPct >= 90) breakdown.liquidity = 95;
    else if (lpPct >= 50) breakdown.liquidity = 70;
    else if (lpPct >= 10) { breakdown.liquidity = 45; reasons.push(`Only ${lpPct.toFixed(1)}% of LP locked`); }
    else { breakdown.liquidity = 10; reasons.push(`LP barely locked (${lpPct.toFixed(1)}%)`); }
  }

  // Authority
  if (report) {
    let authScore = 100;
    if (report.token.mintAuthority !== null) { authScore -= 40; reasons.push('Mint authority active'); }
    if (report.token.freezeAuthority !== null) { authScore -= 30; reasons.push('Freeze authority active'); }
    if (report.tokenMeta?.mutable) { authScore -= 15; reasons.push('Metadata mutable'); }
    breakdown.authority = Math.max(0, authScore);
  }

  // Concentration
  if (report?.risks) {
    const cr = report.risks.filter(r => r.name.toLowerCase().includes('holder') || r.name.toLowerCase().includes('supply'));
    if (cr.length > 0) { breakdown.concentration = Math.max(10, 50 - cr.length * 15); cr.forEach(r => reasons.push(r.description)); }
    else breakdown.concentration = 70;
  }

  // RugCheck score
  if (summary) {
    breakdown.rugcheck = Math.max(0, 100 - (summary.score_normalised || 0) * 10);
  }

  const score = Math.round(
    breakdown.deployer * WEIGHTS.deployer + breakdown.liquidity * WEIGHTS.liquidity +
    breakdown.authority * WEIGHTS.authority + breakdown.concentration * WEIGHTS.concentration +
    breakdown.rugcheck * WEIGHTS.rugcheck
  );

  let status = score <= 30 ? 'RED' : score <= 60 ? 'YELLOW' : 'GREEN';
  if (deployerPreviousRugs > 0 && status === 'GREEN') status = 'YELLOW';

  return { score: Math.max(0, Math.min(100, score)), status, reasons, breakdown };
}

async function test() {
  console.log('Testing Risk Engine with real RugCheck data...\n');

  // Test 1: BONK (established meme token)
  const bonkMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
  const { data: bonkReport } = await axios.get(`${BASE_URL}/v1/tokens/${bonkMint}/report`);
  const { data: bonkSummary } = await axios.get(`${BASE_URL}/v1/tokens/${bonkMint}/report/summary`);
  const bonkRisk = calculateRisk(bonkReport, bonkSummary, 0, 3);
  console.log(`BONK: ${bonkRisk.status} (${bonkRisk.score}/100)`);
  console.log(`  Breakdown:`, bonkRisk.breakdown);
  console.log(`  Reasons:`, bonkRisk.reasons);

  console.log('');

  // Test 2: Simulated rugger (BONK data but with fake rug history)
  const rugRisk = calculateRisk(bonkReport, bonkSummary, 5, 8);
  console.log(`Simulated Rugger: ${rugRisk.status} (${rugRisk.score}/100)`);
  console.log(`  Breakdown:`, rugRisk.breakdown);
  console.log(`  Reasons:`, rugRisk.reasons);

  console.log('');

  // Test 3: No data available
  const unknownRisk = calculateRisk(null, null, 0, 0);
  console.log(`Unknown Token: ${unknownRisk.status} (${unknownRisk.score}/100)`);
  console.log(`  Breakdown:`, unknownRisk.breakdown);
  console.log(`  Reasons:`, unknownRisk.reasons);

  console.log('\n✅ Risk engine test complete');
}

test().catch(console.error);
