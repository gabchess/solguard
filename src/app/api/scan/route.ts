import { NextRequest, NextResponse } from 'next/server';
import { scanToken } from '@/lib/scanner';
import { maybeAlert } from '@/lib/alerts';
import { getTokenByMint } from '@/lib/db';

/**
 * POST /api/scan — Scan a token by mint address.
 * Body: { "mint": "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const { mint } = await request.json();

    if (!mint || typeof mint !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid mint address' },
        { status: 400 },
      );
    }

    // Scan the token
    const result = await scanToken(mint);

    if (!result) {
      // Check if it was already scanned
      const existing = getTokenByMint(mint);
      if (existing) {
        return NextResponse.json({
          message: 'Token already scanned',
          token: existing,
        });
      }
      return NextResponse.json(
        { error: 'Could not scan token — no data available' },
        { status: 404 },
      );
    }

    // Check if alert should fire
    const alerted = await maybeAlert({
      mint: result.mint,
      name: '',
      symbol: '',
      score: result.score,
      status: result.status,
      reasons: result.reasons,
      deployer: '',
    });

    return NextResponse.json({
      ...result,
      alerted,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Internal scan error' },
      { status: 500 },
    );
  }
}
