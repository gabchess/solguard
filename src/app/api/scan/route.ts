import { NextRequest, NextResponse } from 'next/server';
import { scanToken } from '@/lib/scanner';
import { maybeAlert } from '@/lib/alerts';
import { getTokenByMint } from '@/lib/db';

// Simple in-memory rate limiter (per IP, resets on restart)
const scanCooldowns = new Map<string, number>();
const RATE_LIMIT_MS = 3000; // 3 seconds between scans per IP

/**
 * POST /api/scan — Scan a token by mint address.
 * Body: { "mint": "..." }
 * Returns full token data (scans if new, returns cached if already scanned).
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const lastScan = scanCooldowns.get(ip) || 0;
    if (Date.now() - lastScan < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few seconds.' },
        { status: 429 },
      );
    }
    scanCooldowns.set(ip, Date.now());

    const { mint } = await request.json();

    if (!mint || typeof mint !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid mint address' },
        { status: 400 },
      );
    }

    // Check Solana address format (base58, 32-44 chars)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint.trim())) {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
        { status: 400 },
      );
    }

    const cleanMint = mint.trim();

    // Return cached result if already scanned
    const existing = getTokenByMint(cleanMint);
    if (existing) {
      return NextResponse.json({
        cached: true,
        token: existing,
      });
    }

    // Scan the token
    const result = await scanToken(cleanMint);

    if (!result) {
      return NextResponse.json(
        { error: 'Could not scan token. It may not exist or RugCheck has no data for it.' },
        { status: 404 },
      );
    }

    // Check if alert should fire
    await maybeAlert({
      mint: result.mint,
      name: '',
      symbol: '',
      score: result.score,
      status: result.status,
      reasons: result.reasons,
      deployer: '',
    });

    // Fetch the full saved token from DB (includes breakdown)
    const savedToken = getTokenByMint(cleanMint);

    return NextResponse.json({
      cached: false,
      token: savedToken,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Internal scan error' },
      { status: 500 },
    );
  }
}
