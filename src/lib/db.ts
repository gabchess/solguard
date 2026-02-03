import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'db', 'solguard.db');
const SCHEMA_PATH = path.join(process.cwd(), 'db', 'schema.sql');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure db directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run schema on first load
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
  }
  return db;
}

// Token operations
export function insertToken(token: {
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
  source: string;
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO tokens 
    (mint, name, symbol, deployer, risk_score, lp_locked, lp_lock_duration, 
     mint_authority_revoked, holder_count, top_holder_pct, status, risk_reasons, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  return stmt.run(
    token.mint, token.name, token.symbol, token.deployer,
    token.risk_score, token.lp_locked ? 1 : 0, token.lp_lock_duration,
    token.mint_authority_revoked ? 1 : 0, token.holder_count,
    token.top_holder_pct, token.status, JSON.stringify(token.risk_reasons),
    token.source
  );
}

export function getTokens(limit = 50, offset = 0) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM tokens 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

export function getTokenByMint(mint: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM tokens WHERE mint = ?').get(mint);
}

export function getTokenStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM tokens').get() as { count: number };
  const red = db.prepare("SELECT COUNT(*) as count FROM tokens WHERE status = 'RED'").get() as { count: number };
  const yellow = db.prepare("SELECT COUNT(*) as count FROM tokens WHERE status = 'YELLOW'").get() as { count: number };
  const green = db.prepare("SELECT COUNT(*) as count FROM tokens WHERE status = 'GREEN'").get() as { count: number };
  const avgScore = db.prepare('SELECT AVG(risk_score) as avg FROM tokens').get() as { avg: number };
  
  return {
    total: total.count,
    red: red.count,
    yellow: yellow.count,
    green: green.count,
    avgScore: Math.round(avgScore.avg || 0),
  };
}

export function insertScan(tokenMint: string, scanType: string, resultJson: string) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO scans (token_mint, scan_type, result_json) VALUES (?, ?, ?)
  `).run(tokenMint, scanType, resultJson);
}

export function insertAlert(tokenMint: string, alertType: string, tweetId: string, message: string) {
  const db = getDb();
  return db.prepare(`
    INSERT INTO alerts (token_mint, alert_type, tweet_id, message) VALUES (?, ?, ?, ?)
  `).run(tokenMint, alertType, tweetId, message);
}
