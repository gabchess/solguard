import axios from 'axios';

const BASE_URL = process.env.RUGCHECK_API_URL || 'https://api.rugcheck.xyz';

export interface RugCheckRisk {
  name: string;
  value: string;
  description: string;
  score: number;
  level: 'warn' | 'danger' | 'info' | 'good';
}

export interface RugCheckSummary {
  tokenProgram: string;
  tokenType: string;
  risks: RugCheckRisk[];
  score: number;
  score_normalised: number;
  lpLockedPct: number;
}

export interface RugCheckReport {
  mint: string;
  tokenProgram: string;
  creator: string;
  creatorBalance: number;
  token: {
    mintAuthority: string | null;
    supply: number;
    decimals: number;
    isInitialized: boolean;
    freezeAuthority: string | null;
  };
  tokenMeta: {
    name: string;
    symbol: string;
    uri: string;
    mutable: boolean;
    updateAuthority: string;
  };
  risks: RugCheckRisk[];
  score: number;
  score_normalised: number;
  fileMeta: {
    description: string;
    name: string;
    symbol: string;
    image: string;
  };
}

/**
 * Get a quick summary report for a token.
 * Lighter than full report — good for bulk scanning.
 */
export async function getTokenSummary(mint: string): Promise<RugCheckSummary | null> {
  try {
    const { data } = await axios.get(`${BASE_URL}/v1/tokens/${mint}/report/summary`, {
      timeout: 10000,
    });
    return data;
  } catch (err: unknown) {
    const error = err as { response?: { status: number } };
    if (error.response?.status === 404) return null;
    console.error(`RugCheck summary error for ${mint}:`, error.response?.status || err);
    return null;
  }
}

/**
 * Get the full detailed report for a token.
 * Includes creator info, holders, lockers, etc.
 */
export async function getTokenReport(mint: string): Promise<RugCheckReport | null> {
  try {
    const { data } = await axios.get(`${BASE_URL}/v1/tokens/${mint}/report`, {
      timeout: 15000,
    });
    return data;
  } catch (err: unknown) {
    const error = err as { response?: { status: number } };
    if (error.response?.status === 404) return null;
    console.error(`RugCheck report error for ${mint}:`, error.response?.status || err);
    return null;
  }
}

/**
 * Check if deployer has launched other tokens.
 * Uses the RugCheck API to look up creator history.
 */
export async function getCreatorTokens(creatorAddress: string): Promise<string[]> {
  try {
    const { data } = await axios.get(`${BASE_URL}/v1/creators/${creatorAddress}/tokens`, {
      timeout: 10000,
    });
    return Array.isArray(data) ? data : [];
  } catch {
    // This endpoint may not exist — gracefully return empty
    return [];
  }
}
