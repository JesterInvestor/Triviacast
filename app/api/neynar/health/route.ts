// Removed "use server" directive to allow constant exports (Next.js 15 restriction: only async functions can be exported in use server files)
import { NextResponse } from "next/server";

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
  const statsRequested = url.searchParams.get("stats") === "1"; // kept for compatibility though stats are no longer computed here

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
      lastPublish,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export const dynamic = "force-dynamic";