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
    age: number;            // 0-100
  };
}

// Weights for each factor (must sum to 1.0)
// Aligned with AGENTS.md specification
const WEIGHTS = {
  deployer: 0.40,
  liquidity: 0.25,
  authority: 0.15,
  concentration: 0.10,
  age: 0.10,
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
  tokenAgeSec: number = 0,
): RiskAssessment {
  const reasons: string[] = [];
  const breakdown = {
    deployer: 50,
    liquidity: 50,
    authority: 50,
    concentration: 50,
    age: 50,
  };

  // --- DEPLOYER SCORE (40%) ---
  if (deployerPreviousRugs > 0) {
    const rugRate = deployerTotalTokens > 0 
      ? deployerPreviousRugs / deployerTotalTokens 
      : 1;
    breakdown.deployer = Math.max(0, Math.round((1 - rugRate) * 100));
    reasons.push(`Deployer rugged ${deployerPreviousRugs} of ${deployerTotalTokens} previous tokens`);
  } else if (deployerTotalTokens === 0) {
    breakdown.deployer = 40; // New deployer, unknown, slightly risky
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

  // --- AUTHORITY SCORE (15%) ---
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

  // --- TOKEN AGE SCORE (10%) ---
  // Older tokens are generally safer (survived longer without rugging)
  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;
  const ONE_WEEK = 604800;
  const ONE_MONTH = 2592000;
  const ONE_YEAR = 31536000;

  if (tokenAgeSec > 0) {
    if (tokenAgeSec < ONE_HOUR) {
      breakdown.age = 0;
      reasons.push('Token is less than 1 hour old');
    } else if (tokenAgeSec < ONE_DAY) {
      breakdown.age = 30;
      reasons.push('Token is less than 24 hours old');
    } else if (tokenAgeSec < ONE_WEEK) {
      breakdown.age = 60;
    } else if (tokenAgeSec < ONE_MONTH) {
      breakdown.age = 80;
    } else if (tokenAgeSec < ONE_YEAR) {
      breakdown.age = 90;
    } else {
      breakdown.age = 100;
    }
  } else {
    breakdown.age = 20; // Unknown age, treat as risky
    reasons.push('Could not determine token age');
  }

  // Add RugCheck danger signals as reasons (not scored separately, already covered by other factors)
  if (report?.risks) {
    report.risks
      .filter(r => r.level === 'danger')
      .forEach(r => reasons.push(`[DANGER] ${r.name}: ${r.description}`));
  }

  // --- FINAL WEIGHTED SCORE ---
  const score = Math.round(
    breakdown.deployer * WEIGHTS.deployer +
    breakdown.liquidity * WEIGHTS.liquidity +
    breakdown.authority * WEIGHTS.authority +
    breakdown.concentration * WEIGHTS.concentration +
    breakdown.age * WEIGHTS.age
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
