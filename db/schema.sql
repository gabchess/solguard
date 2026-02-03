-- SolGuard Database Schema

CREATE TABLE IF NOT EXISTS tokens (
  mint TEXT PRIMARY KEY,
  name TEXT,
  symbol TEXT,
  deployer TEXT,
  risk_score INTEGER DEFAULT 50,
  lp_locked INTEGER DEFAULT 0,
  lp_lock_duration INTEGER DEFAULT 0,
  mint_authority_revoked INTEGER DEFAULT 0,
  holder_count INTEGER DEFAULT 0,
  top_holder_pct REAL DEFAULT 0,
  status TEXT CHECK(status IN ('RED','YELLOW','GREEN')) DEFAULT 'YELLOW',
  risk_reasons TEXT DEFAULT '[]',
  source TEXT DEFAULT 'pump.fun',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_mint TEXT REFERENCES tokens(mint),
  scan_type TEXT,
  result_json TEXT,
  scanned_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_mint TEXT REFERENCES tokens(mint),
  alert_type TEXT,
  tweet_id TEXT,
  message TEXT,
  posted_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_risk_score ON tokens(risk_score);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_tokens_deployer ON tokens(deployer);
CREATE INDEX IF NOT EXISTS idx_scans_token_mint ON scans(token_mint);
CREATE INDEX IF NOT EXISTS idx_alerts_token_mint ON alerts(token_mint);
