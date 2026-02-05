# Turso Migration Plan for SolGuard

## Overview
Migrate from `better-sqlite3` (sync, file-based) to `@libsql/client` (async, Turso cloud).

## Why Turso?
- Vercel serverless doesn't support file-based SQLite
- Turso = SQLite at the edge with cloud sync
- Same SQL, just async

## Environment Variables Needed
```bash
# Production (Turso Cloud)
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Local dev (optional, can use local SQLite)
TURSO_DATABASE_URL=file:./db/solguard.db
```

## Migration Steps

### Step 1: Install @libsql/client
```bash
npm install @libsql/client
npm uninstall better-sqlite3
```

### Step 2: Create Turso Database
```bash
# Install Turso CLI
npm install -g turso

# Login
turso auth login

# Create database
turso db create solguard

# Get connection URL
turso db show solguard --url

# Get auth token
turso db tokens create solguard
```

### Step 3: Update db.ts

Key changes:
1. Import `@libsql/client` instead of `better-sqlite3`
2. All functions become async
3. Use `client.execute()` for queries
4. Results come as `{ rows: [], columns: [] }`

### Step 4: Update All Callers
Since functions are now async, all callers need `await`:
- API routes
- Server components
- Scanner functions

### Step 5: Initialize Schema on Turso
Run schema.sql on Turso cloud (one-time):
```bash
turso db shell solguard < db/schema.sql
```

## New db.ts Structure

```typescript
import 'server-only';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// All functions now async
export async function getTokens(limit = 50, offset = 0) {
  const result = await client.execute({
    sql: 'SELECT * FROM tokens ORDER BY created_at DESC LIMIT ? OFFSET ?',
    args: [limit, offset],
  });
  return result.rows;
}

// etc...
```

## Files to Update
1. `src/lib/db.ts` - Main DB module (rewrite)
2. `src/app/api/tokens/route.ts` - Add async/await
3. `src/app/api/scan/route.ts` - Add async/await
4. `src/app/api/stats/route.ts` - Add async/await
5. `src/lib/scanner.ts` - Add async/await for DB calls
6. `src/app/page.tsx` - If it uses DB directly
7. `.env.local` - Add Turso credentials
8. `package.json` - Update dependencies

## Vercel Environment Variables
Set in Vercel dashboard:
- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
- HELIUS_API_KEY (existing)

## Testing Checklist
- [ ] Local dev works with `file:./db/solguard.db`
- [ ] All API routes return correct data
- [ ] Token insertion works
- [ ] Stats calculation works
- [ ] Scanner can write to DB
- [ ] Vercel deployment connects to Turso cloud
