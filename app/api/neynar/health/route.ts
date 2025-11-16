"use server";
import { NextResponse } from "next/server";
import { readStore } from "@/lib/neynar";
import fs from "fs/promises";
import path from "path";

const HEALTH_PATH = path.join(process.cwd(), "data", "neynar_health.json");

async function readHealthFile() {
  try {
    const raw = await fs.readFile(HEALTH_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;
  const url = new URL(req.url);
  const probe = url.searchParams.get("probe") === "1"; // if true attempt lightweight signer metadata fetch

  const envStatus = {
    hasApiKey: Boolean(apiKey),
    hasSignerUuid: Boolean(signerUuid),
  };

  let signerMeta: any = null;
  let signerError: any = null;
  if (probe && apiKey && signerUuid) {
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
    } catch (e: any) {
      signerError = String(e);
    }
  }

  // Read challenge store metrics (mentions & scores captured by webhook)
  let storeMetrics: any = {
    totalEntries: 0,
    lastEntryAt: null,
    entriesWithScore: 0,
  };
  try {
    const store = await readStore();
    storeMetrics.totalEntries = store.length;
    if (store.length) {
      const last = store[store.length - 1];
      storeMetrics.lastEntryAt = last.timestamp || null;
      storeMetrics.entriesWithScore = store.filter((e: any) => e.score != null).length;
    }
  } catch {}

  // Read health file (written by publish instrumentation if present)
  const lastPublish = await readHealthFile();

  return NextResponse.json(
    {
      ok: true,
      env: envStatus,
      probeRequested: probe,
      signer: signerMeta,
      signerError,
      store: storeMetrics,
      lastPublish,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export const dynamic = "force-dynamic";