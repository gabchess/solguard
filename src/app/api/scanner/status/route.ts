import { NextResponse } from 'next/server';
import { getScannerStatus } from '@/lib/scanner';
import { startAutofeed, getAutofeedStatus } from '@/lib/autofeed';

export const dynamic = 'force-dynamic';

// Start autofeed on first status check (lazy init)
let autofeedStarted = false;

export async function GET() {
  try {
    // Auto-start the DexScreener feed on first request
    if (!autofeedStarted) {
      startAutofeed();
      autofeedStarted = true;
    }

    const scannerStatus = getScannerStatus();
    const autofeedStatus = getAutofeedStatus();
    
    return NextResponse.json({
      ...scannerStatus,
      autofeed: autofeedStatus,
    });
  } catch (error) {
    console.error('Scanner status error:', error);
    return NextResponse.json(
      { connected: false, tokensToday: 0, lastScan: null, autofeed: { running: false, totalFed: 0, lastPoll: null } },
      { status: 500 }
    );
  }
}
