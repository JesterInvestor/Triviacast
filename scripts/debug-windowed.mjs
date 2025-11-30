import fs from 'fs';
import { createPublicClient, http, keccak256 } from 'viem';
import { base } from 'viem/chains';

// Load .env.local and .env if present (simple parser)
function loadDotenv(path) {
  try {
    const s = fs.readFileSync(path, 'utf8');
    for (const line of s.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx);
      let val = trimmed.slice(idx + 1);
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (e) {
    // ignore missing
  }
}

loadDotenv('./.env.local');
loadDotenv('./.env');

const RPC_URL =
  (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` : undefined)
  || process.env.NEXT_PUBLIC_RPC_URL
  || (process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}` : undefined)
  || process.env.RPC_URL
  || '';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || '';

if (!RPC_URL) {
  console.error('RPC_URL / ALCHEMY key not configured in .env.local or env');
  process.exit(1);
}
if (!CONTRACT_ADDRESS) {
  console.error('CONTRACT_ADDRESS not configured in .env.local or env');
  process.exit(1);
}

const client = createPublicClient({ chain: base, transport: http(RPC_URL) });

async function findFromBlock(cutoffTs) {
  const latest = await client.getBlockNumber();
  let low = 0n;
  let high = BigInt(latest);

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

async function runForDays(days) {
  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff = nowSec - days * 24 * 60 * 60;
  console.log('Running window:', days, 'days; cutoff ts:', cutoff);
  const fromBlock = await findFromBlock(cutoff);
  let fromBlockTs = null;
  try {
    const fb = await client.getBlock({ blockNumber: fromBlock });
    fromBlockTs = Number(fb.timestamp ?? 0n) || null;
  } catch (e) {
    fromBlockTs = null;
  }

  const eventSig = 'AddPoints(address,uint256)';
  const topic0 = keccak256(new TextEncoder().encode(eventSig));

  console.log('fromBlock:', String(fromBlock), 'fromBlockTs:', fromBlockTs);

  let logs = [];
  let getLogsError = null;
  try {
    logs = await client.getLogs({ address: CONTRACT_ADDRESS, fromBlock, toBlock: 'latest', topics: [topic0] });
  } catch (e) {
    getLogsError = String(e?.message ?? e);
  }

  const totals = new Map();
  if (logs && logs.length) {
    for (const l of logs) {
      try {
        if (!l.topics || l.topics.length < 2) continue;
        const walletTopic = l.topics[1];
        const addr = `0x${walletTopic.slice(-40)}`.toLowerCase();
        const amount = l.data ? BigInt(l.data) : 0n;
        const prev = totals.get(addr) ?? 0n;
        totals.set(addr, prev + amount);
      } catch (e) {}
    }
  }

  const rows = Array.from(totals.entries()).map(([walletAddress, tPoints]) => ({ walletAddress, tPoints: Number(tPoints ?? 0n) })).sort((a, b) => b.tPoints - a.tPoints);

  return {
    rows,
    meta: {
      fromBlock: String(fromBlock),
      fromBlockTimestamp: fromBlockTs,
      cutoffTimestamp: cutoff,
      now: nowSec,
      countLogs: logs.length || 0,
      getLogsError,
    },
  };
}

(async () => {
  try {
    const out7 = await runForDays(7);
    console.log('\n7-day meta:', JSON.stringify(out7.meta, null, 2));
    const out30 = await runForDays(30);
    console.log('\n30-day meta:', JSON.stringify(out30.meta, null, 2));
    const outAll = await runForDays(36500);
    console.log('\nAll-time meta:', JSON.stringify(outAll.meta, null, 2));
  } catch (e) {
    console.error('Error running debug:', e);
    process.exitCode = 1;
  }
})();
