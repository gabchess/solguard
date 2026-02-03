const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'db', 'solguard.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

// Ensure db directory
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// Insert mock tokens
const insert = db.prepare(`
  INSERT OR REPLACE INTO tokens 
  (mint, name, symbol, deployer, risk_score, lp_locked, lp_lock_duration, 
   mint_authority_revoked, holder_count, top_holder_pct, status, risk_reasons, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// RED — known rug
insert.run(
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  'RUGTOKEN', 'RUG',
  'ScAmWaLLeTrUgPuLLdEpLoYeR111111111111',
  12, 0, 0, 0, 45, 87.5, 'RED',
  JSON.stringify(['Deployer rugged 8 tokens previously', 'LP not locked', 'Mint authority active', 'Top holder owns 87.5%']),
  'pump.fun'
);

// GREEN — legit token
insert.run(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'USD Coin', 'USDC',
  'CenTrALizeDissuEr1111111111111111111',
  92, 1, 365, 1, 250000, 12.3, 'GREEN',
  JSON.stringify(['LP locked for 365 days', 'Mint authority revoked', 'High holder diversity', 'Established token']),
  'verified'
);

// YELLOW — mid risk
insert.run(
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'Bonk', 'BONK',
  'BonKDeP1oYeR5467890aBcDeFgH1234567',
  55, 1, 30, 1, 85000, 35.2, 'YELLOW',
  JSON.stringify(['LP locked for only 30 days', 'Top holder owns 35.2%', 'Deployer has 2 previous tokens (none rugged)']),
  'pump.fun'
);

console.log('✅ Database seeded with 3 mock tokens');

// Verify
const tokens = db.prepare('SELECT mint, name, status, risk_score FROM tokens').all();
tokens.forEach(t => {
  console.log(`  ${t.status} | ${t.name} (${t.risk_score}/100)`);
});

db.close();
