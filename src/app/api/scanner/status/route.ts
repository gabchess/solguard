import { NextResponse } from 'next/server';
import { getScannerStatus } from '@/lib/scanner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = getScannerStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Scanner status error:', error);
    return NextResponse.json(
      { connected: false, tokensToday: 0, lastScan: null },
      { status: 500 }
    );
  }
}
