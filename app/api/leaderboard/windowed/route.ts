import { NextRequest } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { keccak256 } from 'viem';

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
    // Fixed to weekly leaderboard only (7 days). Ignore any `days` query param.
    const days = 7;

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

    // fetch the fromBlock's timestamp for diagnostic/meta purposes
    let fromBlockTs: number | null = null;
    try {
      const fb = await client.getBlock({ blockNumber: fromBlock });
      fromBlockTs = Number(fb.timestamp ?? 0n) || null;
    } catch (e) {
      fromBlockTs = null;
    }

    // Event signature topic for AddPoints(address,uint256)
    const eventSig = 'AddPoints(address,uint256)';
    const topic0 = keccak256(new TextEncoder().encode(eventSig));

    // Try to use provider as-is first; if it rejects wide ranges (Alchemy free tier),
    // parse the suggested workable block-range from the error and fall back to chunking with that size.
    const latestBlockNum = await client.getBlockNumber();
    const latest = BigInt(latestBlockNum);

    // helper to perform chunked fetch with a given chunkSize
    async function fetchLogsChunked(chunkSize: bigint) {
      const maxChunks = 1000; // safety to avoid runaway requests
      const totalChunks = Number(((latest - fromBlock) / chunkSize) + 1n);
      if (totalChunks > maxChunks) {
        throw new Error(`Requested range requires ${totalChunks} chunks; too large. Use an indexer or smaller window.`);
      }

      const allLogs: any[] = [];
      let attemptedChunks = 0;
      let successfulChunks = 0;
      for (let start = fromBlock; start <= latest; start = start + chunkSize) {
        attemptedChunks++;
        const to = start + chunkSize - 1n > latest ? latest : start + chunkSize - 1n;
        try {
          const chunkLogs = await client.getLogs({
            address: CONTRACT_ADDRESS as `0x${string}`,
            fromBlock: start,
            toBlock: to,
            topics: [topic0],
          } as any);
          if (chunkLogs && chunkLogs.length) {
            allLogs.push(...chunkLogs);
          }
          successfulChunks++;
          // small delay to avoid bursting provider
          await new Promise((res) => setTimeout(res, 25));
        } catch (e: any) {
          // bubble the error up so caller can decide to parse and retry with a smaller chunkSize
          throw e;
        }
      }

      return { allLogs, attemptedChunks, successfulChunks };
    }

    // First try: attempt to fetch logs in one request (fast path)
    let logs: any[] = [];
    let attemptedChunks = 0;
    let successfulChunks = 0;
    let usedChunkSize = 0n;
    try {
      const single = await client.getLogs({ address: CONTRACT_ADDRESS as `0x${string}` , fromBlock, toBlock: 'latest', topics: [topic0] } as any);
      logs = single || [];
      attemptedChunks = 1;
      successfulChunks = 1;
      usedChunkSize = latest - fromBlock + 1n;
    } catch (err: any) {
      // If the provider suggests a workable range in the error message (Alchemy Free tier), parse it.
      const msg = String(err?.message ?? err ?? '');
      const rangeMatch = msg.match(/should work: \[0x([0-9a-fA-F]+), 0x([0-9a-fA-F]+)\]/);
      if (rangeMatch) {
        try {
          const startHex = BigInt('0x' + rangeMatch[1]);
          const endHex = BigInt('0x' + rangeMatch[2]);
          const suggestedSize = endHex - startHex + 1n;
          // Use the suggested size but cap it reasonably
          const chunkSize = suggestedSize > 0n ? suggestedSize : 10n;
          usedChunkSize = chunkSize;
          const res = await fetchLogsChunked(chunkSize);
          logs = res.allLogs;
          attemptedChunks = res.attemptedChunks;
          successfulChunks = res.successfulChunks;
        } catch (innerErr) {
          console.debug('[windowed] retry chunked failed', String(innerErr));
          // fallthrough to try a safe small chunkSize
        }
      }

      // If logs still empty, try a safe small chunk size (10 blocks)
      if (logs.length === 0) {
        try {
          const res = await fetchLogsChunked(10n);
          logs = res.allLogs;
          attemptedChunks = res.attemptedChunks;
          successfulChunks = res.successfulChunks;
          usedChunkSize = 10n;
        } catch (finalErr) {
          console.debug('[windowed] final chunked attempt failed', String(finalErr));
          // Return an error response to client indicating provider limitations
          return new Response(JSON.stringify({ error: String(finalErr) }), { status: 502 });
        }
      }
    }

    // Aggregate per wallet (topics[1] contains indexed address)
    const totals = new Map<string, bigint>();
    for (const l of logs) {
      try {
        if (!l.topics || l.topics.length < 2) continue;
        const walletTopic = l.topics![1] as string; // 32-byte hex
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
        fromBlockTimestamp: fromBlockTs,
        cutoffTimestamp: cutoff,
        now: nowSec,
        processedAt: new Date().toISOString(),
        countLogs: logs.length,
        provider: RPC_URL,
        attemptedChunks,
        successfulChunks,
      },
    };

    return new Response(JSON.stringify(resp), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}

export const runtime = 'edge';
