import { NextResponse } from 'next/server';
import { getScannerStatus } from '@/lib/scanner';

export const dynamic = 'force-dynamic';

export async function GET() {
    const status = getScannerStatus();
    return NextResponse.json(status);
}
