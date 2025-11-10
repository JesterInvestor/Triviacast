import { NextResponse } from 'next/server';
import { getLeaderboardFromChain, getTotalWalletsFromChain, isContractConfigured } from '@/lib/contract';

/**
 * Leaderboard API (non-paginated)
 *
 * This route returns the full leaderboard entries (same behavior as the debug route).
 * Use this if you want the client to fetch the entire leaderboard (no server pagination).
 *
 * Response:
 * {
 *   configured: boolean,
 *   contract: string | null,
 *   chainId: string | null,
 *   total: number,
 *   limit: number,
 *   count: number,
 *   entries: Array<{ walletAddress: string, tPoints: number }>
 * }
 */
export async function GET() {
  try {
    const configured = isContractConfigured();
    const contract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || null;
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || null;

    if (!configured) {
      return NextResponse.json({ configured, contract, chainId, total: 0, limit: 0, count: 0, entries: [] });
    }

    // Get total wallets and request at least that many (or a sensible minimum)
    const total = await getTotalWalletsFromChain();
    const limit = Math.max(total, 50);

    const entries = await getLeaderboardFromChain(limit);

    return NextResponse.json({
      configured,
      contract,
      chainId,
      total,
      limit,
      count: Array.isArray(entries) ? entries.length : 0,
      entries: Array.isArray(entries) ? entries : [],
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err?.message || 'unknown-error' }, { status: 500 });
  }
}