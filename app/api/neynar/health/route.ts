// Removed "use server" directive to allow constant exports (Next.js 15 restriction: only async functions can be exported in use server files)
import { NextResponse } from "next/server";
import { readStore } from "@/lib/neynar";
import fs from "fs/promises";
import path from "path";

const HEALTH_PATH = path.join(process.cwd(), "data", "neynar_health.json");
const SIGNER_CACHE_PATH = path.join(process.cwd(), "data", "signer_cache.json");
const SIGNER_CACHE_TTL_MS = 60_000; // 60s cache

async function readHealthFile() {
  try {
    const raw = await fs.readFile(HEALTH_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function readSignerCache() {
  try {
    const raw = await fs.readFile(SIGNER_CACHE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeSignerCache(data: any) {
  try {
    await fs.mkdir(path.dirname(SIGNER_CACHE_PATH), { recursive: true });
    await fs.writeFile(SIGNER_CACHE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

export async function GET(req: Request) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;
  const url = new URL(req.url);
  const probe = url.searchParams.get("probe") === "1"; // if true attempt lightweight signer metadata fetch
  const statsRequested = url.searchParams.get("stats") === "1"; // compute challenge stats

  const envStatus = {
    hasApiKey: Boolean(apiKey),
    hasSignerUuid: Boolean(signerUuid),
  };

  let signerMeta: any = null;
  let signerError: any = null;
  if (probe && apiKey && signerUuid) {
    // Try cache first
    const cache = await readSignerCache();
    const now = Date.now();
    if (cache && cache.timestamp && now - cache.timestamp < SIGNER_CACHE_TTL_MS) {
      signerMeta = cache.meta;
    } else {
      try {
        const metaResp = await fetch(
          `https://api.neynar.com/v2/farcaster/signer?signer_uuid=${encodeURIComponent(signerUuid)}`,
          { headers: { "x-api-key": apiKey } }
        );
        signerMeta = await metaResp.json().catch(() => ({}));
        if (!metaResp.ok) {
          signerError = { status: metaResp.status, body: signerMeta };
          signerMeta = null;
        }
        await writeSignerCache({ meta: signerMeta, timestamp: now });
      } catch (e: any) {
        signerError = String(e);
      }
    }
  }

  // Read challenge store metrics (mentions & scores captured by webhook)
  let storeMetrics: any = {
    totalEntries: 0,
    lastEntryAt: null,
    entriesWithScore: 0,
  };
  let stats: any = null;
  try {
    const store = await readStore();
    storeMetrics.totalEntries = store.length;
    if (store.length) {
      const last = store[store.length - 1];
      storeMetrics.lastEntryAt = last.timestamp || null;
      storeMetrics.entriesWithScore = store.filter((e: any) => e.score != null).length;
    }

    if (statsRequested && store.length) {
      // Build reciprocal match stats similar to webhook logic
      const processedPairs = new Set<string>();
      let totalMatches = 0;
      let ties = 0;
      let wins = 0;
      let aggregateMargin = 0;
      let totalScoreSamples = 0;
      let scoreSum = 0;
      // Index by castHash for faster lookups if needed
      for (let i = 0; i < store.length; i++) {
        const a = store[i];
        if (!a || a.score == null || !Array.isArray(a.mentioned) || !a.authorFid) continue;
        for (let j = i + 1; j < store.length; j++) {
          const b = store[j];
          if (!b || b.score == null || !Array.isArray(b.mentioned) || !b.authorFid) continue;
          const mentionsA = a.mentioned.some((m: any) => Number(m.fid) === Number(b.authorFid));
          const mentionsB = b.mentioned.some((m: any) => Number(m.fid) === Number(a.authorFid));
          if (!mentionsA || !mentionsB) continue;
          // Pair key (order independent)
          const pairKey = [a.authorFid, b.authorFid].sort((x, y) => Number(x) - Number(y)).join(":");
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);
          totalMatches++;
          const aScore = Number(a.score);
            const bScore = Number(b.score);
          scoreSum += aScore + bScore;
          totalScoreSamples += 2;
          if (aScore === bScore) {
            ties++;
          } else {
            wins++;
            aggregateMargin += Math.abs(aScore - bScore);
          }
        }
      }
      stats = {
        totalMatches,
        wins,
        ties,
        winRate: totalMatches ? wins / totalMatches : 0,
        tieRate: totalMatches ? ties / totalMatches : 0,
        avgMargin: wins ? aggregateMargin / wins : 0,
        avgScore: totalScoreSamples ? scoreSum / totalScoreSamples : 0,
      };
    }
  } catch {}

  // Read health file (written by publish instrumentation if present)
  const lastPublish = await readHealthFile();

  return NextResponse.json(
    {
      ok: true,
      env: envStatus,
      probeRequested: probe,
      statsRequested,
      signer: signerMeta,
      signerError,
      store: storeMetrics,
      stats,
      lastPublish,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export const dynamic = "force-dynamic";