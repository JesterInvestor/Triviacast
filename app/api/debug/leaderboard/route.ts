import { NextResponse } from 'next/server';
import { getLeaderboardFromChain, getTotalWalletsFromChain, isContractConfigured } from '@/lib/contract';

export async function GET() {
  try {
    const configured = isContractConfigured();
    const tpointsV2 = process.env.NEXT_PUBLIC_TRIVIAPOINTS_ADDRESS || null;
    const legacyContract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || null;
    const iqPoints = process.env.NEXT_PUBLIC_IQPOINTS_ADDRESS || null;
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || null;
    if (!configured) {
      return NextResponse.json({ configured, tpointsV2, legacyContract, iqPoints, chainId, total: 0, entries: [] });
    }

    const total = await getTotalWalletsFromChain();
    const limit = Math.max(total, 50);
    const entries = await getLeaderboardFromChain(limit);

    return NextResponse.json({ configured, tpointsV2, legacyContract, iqPoints, chainId, total, limit, count: entries.length, entries });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err?.message || 'unknown-error' }, { status: 500 });
  }
}
