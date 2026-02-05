import { NextResponse } from 'next/server';
import { getTokens, getTokenStats } from '@/lib/db';

export async function GET() {
  try {
    const [tokens, stats] = await Promise.all([
      getTokens(100, 0),
      getTokenStats(),
    ]);
    return NextResponse.json({ tokens, stats });
  } catch (error) {
    console.error('Failed to fetch tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
