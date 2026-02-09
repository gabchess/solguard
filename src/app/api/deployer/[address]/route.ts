import { NextRequest, NextResponse } from 'next/server';
import { getTokensByDeployer, getDeployerStats } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
        { status: 400 }
      );
    }

    const [tokens, stats] = await Promise.all([
      getTokensByDeployer(address),
      getDeployerStats(address),
    ]);

    return NextResponse.json({ address, tokens, stats });
  } catch (error) {
    console.error('Deployer lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deployer data' },
      { status: 500 }
    );
  }
}
