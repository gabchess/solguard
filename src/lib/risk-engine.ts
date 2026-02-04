import { RugCheckReport, RugCheckSummary } from './rugcheck';

export interface RiskAssessment {
  score: number;           // 0-100 (0 = extremely dangerous, 100 = safe)
  status: 'RED' | 'YELLOW' | 'GREEN';
  reasons: string[];
  breakdown: {
    deployer: number;      // 0-100
    liquidity: number;     // 0-100
    authority: number;      // 0-100
    concentration: number;  // 0-100
    rugcheck: number;       // 0-100
  };
}

// Weights for each factor (must sum to 1.0)
const WEIGHTS = {
  deployer: 0.30,
  liquidity: 0.25,
  authority: 0.20,
  concentration: 0.15,
  rugcheck: 0.10,
};

/**
 * Calculate risk score for a token.
 * 0 = extremely dangerous, 100 = very safe.
 * Uses RugCheck data + additional heuristics.
 */
export function calculateRisk(
  report: RugCheckReport | null,
  summary: RugCheckSummary | null,
  deployerPreviousRugs: number = 0,
  deployerTotalTokens: number = 0,
): RiskAssessment {
  const reasons: string[] = [];
  const breakdown = {
    deployer: 50,
    liquidity: 50,
    authority: 50,
    concentration: 50,
    rugcheck: 50,
  };

  // --- DEPLOYER SCORE (30%) ---
  if (deployerPreviousRugs > 0) {
    const rugRate = deployerTotalTokens > 0 
      ? deployerPreviousRugs / deployerTotalTokens 
      : 1;
    breakdown.deployer = Math.max(0, Math.round((1 - rugRate) * 30));
    reasons.push(`Deployer rugged ${deployerPreviousRugs} of ${deployerTotalTokens} previous tokens`);
  } else if (deployerTotalTokens === 0) {
    breakdown.deployer = 40; // New deployer — unknown, slightly risky
    reasons.push('New deployer with no token history');
  } else {
    breakdown.deployer = Math.min(100, 60 + deployerTotalTokens * 5);
    // Clean deployer with history = good
  }

  // --- LIQUIDITY SCORE (25%) ---
  if (summary) {
    const lpPct = summary.lpLockedPct || 0;
    if (lpPct >= 90) {
      breakdown.liquidity = 95;
    } else if (lpPct >= 50) {
      breakdown.liquidity = 70;
    } else if (lpPct >= 10) {
      breakdown.liquidity = 45;
      reasons.push(`Only ${lpPct.toFixed(1)}% of LP locked`);
    } else {
      breakdown.liquidity = 10;
      reasons.push(`LP barely locked (${lpPct.toFixed(1)}%)`);
    }
  } else {
    breakdown.liquidity = 20;
    reasons.push('Could not verify LP lock status');
  }

  // --- AUTHORITY SCORE (20%) ---
  if (report) {
    let authScore = 100;
    
    if (report.token.mintAuthority !== null) {
      authScore -= 40;
      reasons.push('Mint authority is active — new tokens can be minted');
    }
    
    if (report.token.freezeAuthority !== null) {
      authScore -= 30;
      reasons.push('Freeze authority is active — your tokens can be frozen');
    }
    
    if (report.tokenMeta.mutable) {
      authScore -= 15;
      reasons.push('Token metadata is mutable');
    }
    
    breakdown.authority = Math.max(0, authScore);
  } else {
    breakdown.authority = 30;
    reasons.push('Could not verify token authorities');
  }

  // --- CONCENTRATION SCORE (15%) ---
  // We'll enhance this with holder data later
  // For now, use RugCheck risk signals
  if (report?.risks) {
    const concentrationRisks = report.risks.filter(r => 
      r.name.toLowerCase().includes('holder') || 
      r.name.toLowerCase().includes('supply') ||
      r.name.toLowerCase().includes('single')
    );
    if (concentrationRisks.length > 0) {
      breakdown.concentration = Math.max(10, 50 - concentrationRisks.length * 15);
      concentrationRisks.forEach(r => reasons.push(r.description));
    } else {
      breakdown.concentration = 70;
    }
  }

  // --- RUGCHECK SCORE (10%) ---
  if (summary) {
    // RugCheck score_normalised: 0 = safest, higher = riskier
    // We invert: 0 risk → 100 our score, high risk → low our score
    const normalized = summary.score_normalised || 0;
    breakdown.rugcheck = Math.max(0, 100 - normalized * 10);
    
    // Add high-severity risks as reasons
    if (report?.risks) {
      report.risks
        .filter(r => r.level === 'danger')
        .forEach(r => reasons.push(`[DANGER] ${r.name}: ${r.description}`));
    }
  }

  // --- FINAL WEIGHTED SCORE ---
  const score = Math.round(
    breakdown.deployer * WEIGHTS.deployer +
    breakdown.liquidity * WEIGHTS.liquidity +
    breakdown.authority * WEIGHTS.authority +
    breakdown.concentration * WEIGHTS.concentration +
    breakdown.rugcheck * WEIGHTS.rugcheck
  );

  // Determine status
  let status: 'RED' | 'YELLOW' | 'GREEN';
  if (score <= 30) {
    status = 'RED';
  } else if (score <= 60) {
    status = 'YELLOW';
  } else {
    status = 'GREEN';
  }

  // Override: if deployer has ANY rugs, cap at YELLOW
  if (deployerPreviousRugs > 0 && status === 'GREEN') {
    status = 'YELLOW';
    reasons.push('Score capped: deployer has previous rug history');
  }

  // Override: if mint authority active, cap at YELLOW
  if (report && report.token.mintAuthority !== null && status === "GREEN") {
    status = 'YELLOW';
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    status,
    reasons: [...new Set(reasons)], // deduplicate
    breakdown,
  };
}
