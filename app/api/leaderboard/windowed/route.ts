import { NextRequest } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { keccak256, utf8ToBytes } from 'viem';

// Minimal server route that aggregates AddPoints(address,uint256) events
// into a windowed leaderboard (days param).

const RPC_URL =
  (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` : undefined)
  || process.env.NEXT_PUBLIC_RPC_URL
  || (process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}` : undefined)
  || process.env.RPC_URL
  || '';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || '';

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL || undefined),
});

async function findFromBlock(cutoffTs: number): Promise<bigint> {
  // Binary search between block 0 and latest to find first block with timestamp >= cutoffTs
  const latest = await client.getBlockNumber();
  let low = 0n;
  let high = BigInt(latest);

  // quick check: if latest block already before cutoff, return 0
  const latestBlock = await client.getBlock({ blockNumber: latest });
  const latestTs = Number(latestBlock.timestamp ?? 0n);
  if (latestTs < cutoffTs) return 0n;

  while (low < high) {
    const mid = ((low + high) >> 1n);
    const b = await client.getBlock({ blockNumber: mid });
    const ts = Number(b.timestamp ?? 0n);
    if (ts >= cutoffTs) {
      high = mid;
    } else {
      low = mid + 1n;
    }
  }
  return low;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const daysParam = url.searchParams.get('days') || '7';
    const days = Number(daysParam) || 7;

    if (!CONTRACT_ADDRESS) {
      return new Response(JSON.stringify({ error: 'Contract address not configured' }), { status: 500 });
    }

    if (!RPC_URL) {
      return new Response(JSON.stringify({ error: 'RPC_URL not configured' }), { status: 500 });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const cutoff = nowSec - days * 24 * 60 * 60;

    // Find fromBlock using block timestamps
    const fromBlock = await findFromBlock(cutoff);

    // Event signature topic for AddPoints(address,uint256)
    const eventSig = 'AddPoints(address,uint256)';
    const topic0 = keccak256(utf8ToBytes(eventSig));

    const logs = await client.getLogs({
      address: CONTRACT_ADDRESS as `0x${string}`,
      fromBlock,
      toBlock: 'latest',
      topics: [topic0],
    });

    // Aggregate per wallet (topics[1] contains indexed address)
    const totals = new Map<string, bigint>();
    for (const l of logs) {
      try {
        if (!l.topics || l.topics.length < 2) continue;
        const walletTopic = l.topics[1]; // 32-byte hex
        // address is last 20 bytes (40 hex chars)
        const addr = `0x${walletTopic.slice(-40)}`.toLowerCase();
        const amount = l.data ? BigInt(l.data) : 0n;
        const prev = totals.get(addr) ?? 0n;
        totals.set(addr, prev + amount);
      } catch (e) {
        // ignore per-log errors
      }
    }

    // Convert to normalized rows
    const rows = Array.from(totals.entries()).map(([walletAddress, tPoints]) => ({
      walletAddress,
      tPoints: Number(tPoints ?? 0n),
    })).sort((a, b) => b.tPoints - a.tPoints);

    const resp = {
      rows,
      meta: {
        fromBlock: String(fromBlock),
        processedAt: new Date().toISOString(),
        countLogs: logs.length,
      },
    };

    return new Response(JSON.stringify(resp), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}

export const runtime = 'edge';
