import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { createPublicClient, http, keccak256 } from 'viem';
import { base } from 'viem/chains';

// Simple SQLite indexer for AddPoints(address,uint256) events
// Usage: NODE_ENV=production node ./scripts/indexer.mjs
// Environment variables used:
// - RPC_URL or NEXT_PUBLIC_ALCHEMY_API_KEY / NEXT_PUBLIC_RPC_URL
// - NEXT_PUBLIC_CONTRACT_ADDRESS or CONTRACT_ADDRESS
// - LEADERBOARD_DB_PATH (optional) default: ./data/leaderboard.db

function loadDotenv(file) {
  try {
    const s = fs.readFileSync(file, 'utf8');
    for (const line of s.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx === -1) continue;
      const k = t.slice(0, idx);
      let v = t.slice(idx + 1);
      if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch (e) {}
}

loadDotenv('.env.local');
loadDotenv('.env');

const RPC_URL =
  (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` : undefined)
  || process.env.NEXT_PUBLIC_RPC_URL
  || (process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}` : undefined)
  || process.env.RPC_URL
  || '';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || '';
const DB_PATH = process.env.LEADERBOARD_DB_PATH || path.join(process.cwd(), 'data', 'leaderboard.db');

if (!RPC_URL) {
  console.error('RPC_URL not configured');
  process.exit(1);
}
if (!CONTRACT_ADDRESS) {
  console.error('CONTRACT_ADDRESS not configured');
  process.exit(1);
}

const client = createPublicClient({ chain: base, transport: http(RPC_URL) });

const usePostgres = Boolean(process.env.DATABASE_URL);
let pgClient = null;
if (usePostgres) {
  pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();
  // create schema if missing
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      amount TEXT NOT NULL,
      blockNumber BIGINT NOT NULL,
      timestamp BIGINT NOT NULL,
      txHash TEXT,
      logIndex INTEGER
    );
  `);
  await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_events_wallet ON events(wallet);`);
  await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);`);
}

async function findLatestIndexedBlock() {
  if (!usePostgres) return 0n;
  const row = await pgClient.query('SELECT MAX(blockNumber) as b FROM events');
  const b = row.rows?.[0]?.b ?? null;
  if (!b) return 0n;
  return BigInt(b);
}

async function fetchBlockTimestamp(blockNumber) {
  const b = await client.getBlock({ blockNumber });
  return Number(b.timestamp ?? 0n);
}

async function indexLoop() {
  console.log('Starting indexer. RPC:', RPC_URL);
  const topic0 = keccak256(new TextEncoder().encode('AddPoints(address,uint256)'));

  while (true) {
    try {
      const latestBlockNum = await client.getBlockNumber();
      const latest = BigInt(latestBlockNum);
      let fromBlock = await findLatestIndexedBlock();
      if (fromBlock === 0n) {
        // start from a safe recent window (e.g., last 100k blocks) to avoid scanning full chain on first run
        fromBlock = latest > 100000n ? latest - 100000n : 0n;
      } else {
        fromBlock = fromBlock + 1n;
      }

      if (fromBlock > latest) {
        // nothing to do
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }

      const chunk = 5000n; // chunk size for indexer, adjust as needed
      const toBlock = fromBlock + chunk - 1n > latest ? latest : fromBlock + chunk - 1n;

      console.log(`Indexing blocks ${String(fromBlock)} -> ${String(toBlock)} (latest ${String(latest)})`);
      const logs = await client.getLogs({ address: CONTRACT_ADDRESS, fromBlock, toBlock, topics: [topic0] } as any);
      console.log('Fetched logs:', logs.length);

      for (const l of logs) {
        try {
          if (!l.topics || l.topics.length < 2) continue;
          const walletTopic = l.topics[1];
          const addr = `0x${walletTopic.slice(-40)}`.toLowerCase();
          const amountStr = l.data ? String(BigInt(l.data).toString()) : '0';
          const blockNumber = Number(l.blockNumber ?? 0n);
          let ts = 0;
          try { ts = await fetchBlockTimestamp(l.blockNumber ?? 0n); } catch (e) { ts = Math.floor(Date.now()/1000); }
          const id = `${l.transactionHash}:${l.logIndex}`;
          if (usePostgres) {
            try {
              await pgClient.query('INSERT INTO events(id,wallet,amount,blockNumber,timestamp,txHash,logIndex) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING', [id, addr, amountStr, blockNumber, ts, l.transactionHash, Number(l.logIndex ?? 0)]);
            } catch (e) {
              console.error('pg insert error', e);
            }
          }
        } catch (e) {
          console.error('per-log insert error', e);
        }
      }

      // small pause
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error('indexer loop error', String(e));
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

indexLoop().catch((e) => { console.error('indexer failed', e); process.exit(1); });
