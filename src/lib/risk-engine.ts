import { RugCheckReport, RugCheckSummary } from './rugcheck';
import { WalletFunding } from './helius';

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
  killSwitchFlags: string[];
  fundingSource?: {
    address: string;
    type: string;
    amount: number;
  };
}

// Default weights (must sum to 1.0)
const WEIGHTS_DEFAULT = {
  deployer: 0.40,
  liquidity: 0.25,
  authority: 0.15,
  concentration: 0.10,
  age: 0.10,
};

// pump.fun tokens: authority is auto-revoked (no signal), redistribute weight
const WEIGHTS_PUMP_FUN = {
  deployer: 0.45,
  liquidity: 0.30,
  authority: 0.00,
  concentration: 0.15,
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
  source: string = 'unknown',
  fundingData: WalletFunding | null = null,
): RiskAssessment {
  const reasons: string[] = [];
  const killSwitchFlags: string[] = [];
  const breakdown = {
    deployer: 50,
    liquidity: 50,
    authority: 50,
    concentration: 50,
    age: 50,
  };

  const weights = source === 'pump.fun' ? WEIGHTS_PUMP_FUN : WEIGHTS_DEFAULT;

  // --- DEPLOYER SCORE (40-45%) ---
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

  // --- LIQUIDITY SCORE (25-30%) ---
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

  // --- AUTHORITY SCORE (15% default, 0% for pump.fun) ---
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

  // --- CONCENTRATION SCORE (10-15%) ---
  // We'll enhance this with holder data later
  // For now, use RugCheck risk signals
  const concentrationRisks = report?.risks?.filter(r =>
    r.name.toLowerCase().includes('holder') ||
    r.name.toLowerCase().includes('supply') ||
    r.name.toLowerCase().includes('single')
  ) || [];

  if (report?.risks) {
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
  let score = Math.round(
    breakdown.deployer * weights.deployer +
    breakdown.liquidity * weights.liquidity +
    breakdown.authority * weights.authority +
    breakdown.concentration * weights.concentration +
    breakdown.age * weights.age
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

  // --- FUNDING SOURCE ANALYSIS (bonus/penalty on deployer score) ---
  let fundingSource: RiskAssessment['fundingSource'] = undefined;
  if (fundingData) {
    fundingSource = {
      address: fundingData.fundingSource,
      type: fundingData.fundingSourceType,
      amount: fundingData.amount,
    };

    const srcType = (fundingData.fundingSourceType || '').toLowerCase();
    if (srcType === 'exchange') {
      // Funded from exchange = slightly better (KYC'd source)
      breakdown.deployer = Math.min(100, breakdown.deployer + 10);
      reasons.push(`Deployer funded from exchange (${fundingData.fundingSource.slice(0, 8)}...)`);
    } else if (srcType === 'mixer' || srcType === 'tornado') {
      // Funded from mixer = very suspicious
      breakdown.deployer = Math.max(0, breakdown.deployer - 30);
      reasons.push(`[WARNING] Deployer funded through mixer/privacy tool`);
    } else if (srcType === 'unknown' && fundingData.amount < 0.1) {
      // Tiny funding from unknown = fresh wallet, suspicious
      breakdown.deployer = Math.max(0, breakdown.deployer - 10);
      reasons.push(`Deployer funded with tiny amount (${fundingData.amount.toFixed(4)} SOL) from unknown source`);
    }
  }

  // --- KILL SWITCH FLAGS ---
  // Hard overrides that force RED regardless of composite score

  if (deployerPreviousRugs >= 2) {
    killSwitchFlags.push('DEPLOYER_SERIAL_RUGGER');
    reasons.push(`[KILL SWITCH] Serial rugger: deployer has ${deployerPreviousRugs} previous rugs`);
  }

  if (summary && (summary.lpLockedPct || 0) < 5) {
    killSwitchFlags.push('LP_UNLOCKED');
    reasons.push(`[KILL SWITCH] LP unlocked: only ${(summary.lpLockedPct || 0).toFixed(1)}% of liquidity is locked`);
  }

  if (concentrationRisks.length >= 3) {
    killSwitchFlags.push('CONCENTRATION_EXTREME');
    reasons.push(`[KILL SWITCH] Extreme concentration: ${concentrationRisks.length} holder/supply risk signals`);
  }

  if (killSwitchFlags.length > 0) {
    status = 'RED';
    score = Math.min(score, 25);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    status,
    reasons: [...new Set(reasons)], // deduplicate
    breakdown,
    killSwitchFlags,
    fundingSource,
  };
}
