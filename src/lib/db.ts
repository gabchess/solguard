import 'server-only';
import { createClient, Client, InValue } from '@libsql/client';

// Turso/LibSQL client - supports both local SQLite and cloud
const client: Client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./db/solguard.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize schema on module load
const schemaInitialized = (async () => {
  try {
    await client.executeMultiple(`
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
        risk_breakdown TEXT DEFAULT '{}',
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
    `);
    console.log('[DB] Schema initialized');
  } catch (err) {
    // Tables likely already exist
    console.log('[DB] Schema already exists or error:', err);
  }
})();

// Get the client (for direct queries)
export function getClient(): Client {
  return client;
}

// Execute raw SQL query
export async function executeQuery(sql: string, args: InValue[] = []) {
  await schemaInitialized;
  const result = await client.execute({ sql, args });
  return result;
}

// Token operations
export async function insertToken(token: {
  mint: string;
  name: string;
  symbol: string;
  deployer: string;
  risk_score: number;
  lp_locked: boolean;
  lp_lock_duration: number;
  mint_authority_revoked: boolean;
  holder_count: number;
  top_holder_pct: number;
  status: 'RED' | 'YELLOW' | 'GREEN';
  risk_reasons: string[];
  risk_breakdown?: Record<string, number>;
  source: string;
}) {
  await schemaInitialized;
  return client.execute({
    sql: `
      INSERT OR REPLACE INTO tokens 
      (mint, name, symbol, deployer, risk_score, lp_locked, lp_lock_duration, 
       mint_authority_revoked, holder_count, top_holder_pct, status, risk_reasons, risk_breakdown, source, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    args: [
      token.mint, token.name, token.symbol, token.deployer,
      token.risk_score, token.lp_locked ? 1 : 0, token.lp_lock_duration,
      token.mint_authority_revoked ? 1 : 0, token.holder_count,
      token.top_holder_pct, token.status, JSON.stringify(token.risk_reasons),
      JSON.stringify(token.risk_breakdown || {}),
      token.source
    ],
  });
}

export async function getTokens(limit = 50, offset = 0) {
  await schemaInitialized;
  const result = await client.execute({
    sql: 'SELECT * FROM tokens ORDER BY created_at DESC LIMIT ? OFFSET ?',
    args: [limit, offset],
  });
  return result.rows;
}

export async function getTokenByMint(mint: string) {
  await schemaInitialized;
  const result = await client.execute({
    sql: 'SELECT * FROM tokens WHERE mint = ?',
    args: [mint],
  });
  return result.rows[0] || null;
}

export async function getTokenStats() {
  await schemaInitialized;
  const [total, red, yellow, green, avgScore] = await Promise.all([
    client.execute('SELECT COUNT(*) as count FROM tokens'),
    client.execute("SELECT COUNT(*) as count FROM tokens WHERE status = 'RED'"),
    client.execute("SELECT COUNT(*) as count FROM tokens WHERE status = 'YELLOW'"),
    client.execute("SELECT COUNT(*) as count FROM tokens WHERE status = 'GREEN'"),
    client.execute('SELECT AVG(risk_score) as avg FROM tokens'),
  ]);

  return {
    total: Number(total.rows[0]?.count ?? 0),
    red: Number(red.rows[0]?.count ?? 0),
    yellow: Number(yellow.rows[0]?.count ?? 0),
    green: Number(green.rows[0]?.count ?? 0),
    avgScore: Math.round(Number(avgScore.rows[0]?.avg ?? 0)),
  };
}

export async function getTokensByDeployer(deployer: string) {
  await schemaInitialized;
  const result = await client.execute({
    sql: 'SELECT * FROM tokens WHERE deployer = ? ORDER BY created_at DESC',
    args: [deployer],
  });
  return result.rows;
}

export async function getDeployerStats(deployer: string) {
  await schemaInitialized;
  const [total, red, yellow, green, avgScore] = await Promise.all([
    client.execute({ sql: 'SELECT COUNT(*) as count FROM tokens WHERE deployer = ?', args: [deployer] }),
    client.execute({ sql: "SELECT COUNT(*) as count FROM tokens WHERE deployer = ? AND status = 'RED'", args: [deployer] }),
    client.execute({ sql: "SELECT COUNT(*) as count FROM tokens WHERE deployer = ? AND status = 'YELLOW'", args: [deployer] }),
    client.execute({ sql: "SELECT COUNT(*) as count FROM tokens WHERE deployer = ? AND status = 'GREEN'", args: [deployer] }),
    client.execute({ sql: 'SELECT AVG(risk_score) as avg FROM tokens WHERE deployer = ?', args: [deployer] }),
  ]);

  return {
    total: Number(total.rows[0]?.count ?? 0),
    red: Number(red.rows[0]?.count ?? 0),
    yellow: Number(yellow.rows[0]?.count ?? 0),
    green: Number(green.rows[0]?.count ?? 0),
    avgScore: Math.round(Number(avgScore.rows[0]?.avg ?? 0)),
  };
}

export async function insertScan(tokenMint: string, scanType: string, resultJson: string) {
  await schemaInitialized;
  return client.execute({
    sql: 'INSERT INTO scans (token_mint, scan_type, result_json) VALUES (?, ?, ?)',
    args: [tokenMint, scanType, resultJson],
  });
}

export async function insertAlert(tokenMint: string, alertType: string, tweetId: string, message: string) {
  await schemaInitialized;
  return client.execute({
    sql: 'INSERT INTO alerts (token_mint, alert_type, tweet_id, message) VALUES (?, ?, ?, ?)',
    args: [tokenMint, alertType, tweetId, message],
  });
}

/**
 * Get top deployers ranked by number of RED tokens (serial ruggers).
 * Returns deployers with 2+ tokens, sorted by red count desc.
 */
export async function getSerialRuggers(limit: number = 10) {
  await schemaInitialized;
  const result = await client.execute({
    sql: `SELECT 
      deployer,
      COUNT(*) as total_tokens,
      SUM(CASE WHEN status = 'RED' THEN 1 ELSE 0 END) as red_count,
      SUM(CASE WHEN status = 'YELLOW' THEN 1 ELSE 0 END) as yellow_count,
      ROUND(AVG(risk_score)) as avg_score,
      MIN(risk_score) as worst_score,
      MAX(created_at) as latest_token_time
    FROM tokens 
    WHERE deployer != 'unknown'
    GROUP BY deployer 
    HAVING COUNT(*) >= 2
    ORDER BY red_count DESC, avg_score ASC
    LIMIT ?`,
    args: [limit],
  });
  return result.rows;
}

// For backwards compatibility - deprecated, use executeQuery instead
export function getDb() {
  console.warn('[DB] getDb() is deprecated. Use executeQuery() or getClient() instead.');
  return {
    prepare: (sql: string) => ({
      run: async (...args: InValue[]) => executeQuery(sql, args),
      get: async (...args: InValue[]) => {
        const result = await executeQuery(sql, args);
        return result.rows[0];
      },
      all: async (...args: InValue[]) => {
        const result = await executeQuery(sql, args);
        return result.rows;
      },
    }),
  };
}
