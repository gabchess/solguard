import { NextResponse } from 'next/server';
import { getSerialRuggers } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ruggers = await getSerialRuggers(10);
    return NextResponse.json({ ruggers });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ ruggers: [] }, { status: 500 });
  }
}
