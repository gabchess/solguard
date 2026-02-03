export interface Token {
  mint: string;
  name: string;
  symbol: string;
  deployer: string;
  risk_score: number;
  lp_locked: number;
  lp_lock_duration: number;
  mint_authority_revoked: number;
  holder_count: number;
  top_holder_pct: number;
  status: 'RED' | 'YELLOW' | 'GREEN';
  risk_reasons: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface TokenStats {
  total: number;
  red: number;
  yellow: number;
  green: number;
  avgScore: number;
}
