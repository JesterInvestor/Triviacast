
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const HEALTH_PATH = path.join(process.cwd(), "data", "neynar_health.json");
const NEYNAR_API_URL = "https://api.neynar.com/v2/farcaster/cast/";

type PublishOpts = {
  text: string;
  parent?: string | null;
  parent_author_fid?: number | null;
  embeds?: any[];
  channel_id?: string;
};



function randomIdem() {
  return crypto.randomBytes(12).toString("hex").slice(0, 16);
}

export async function publishCast(opts: PublishOpts) {
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  const NEYNAR_SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;
  if (!NEYNAR_API_KEY || !NEYNAR_SIGNER_UUID) {
    throw new Error("NEYNAR_API_KEY and NEYNAR_SIGNER_UUID must be set in env");
  }

  const body: any = {
    signer_uuid: NEYNAR_SIGNER_UUID,
    text: opts.text,
    channel_id: opts.channel_id ?? "neynar",
    idem: randomIdem(),
  };

  if (opts.parent) body.parent = opts.parent;
  if (opts.parent_author_fid != null) body.parent_author_fid = Number(opts.parent_author_fid);
  if (opts.embeds) body.embeds = opts.embeds;

  const res = await fetch(NEYNAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": NEYNAR_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = parsed?.error || JSON.stringify(parsed) || `status ${res.status}`;
    throw new Error(`Neynar publish failed: ${errMsg}`);
  }
  // Write health file with last successful publish metadata (best-effort)
  try {
    const health = {
      lastHash: parsed?.cast?.hash || null,
      lastTextSample: String(opts.text || "").slice(0, 120),
      lastAt: new Date().toISOString(),
      channel: opts.channel_id ?? "neynar",
    };
    await fs.mkdir(path.dirname(HEALTH_PATH), { recursive: true });
    await fs.writeFile(HEALTH_PATH, JSON.stringify(health, null, 2), "utf-8");
  } catch {}
  return parsed;
}

/**
 * Try to extract a numeric Triviacast "T Points" score from a cast text.
 * Examples matched:
 * - "I just played Triviacast with 8 (🔥 8,000 T Points)!"
 * - "8,000 T Points"
 * - "I scored 8000"
 */
export function parseScoreFromText(text: string): number | null {
  if (!text) return null;
  // Look for patterns like "8,000 T Points", "8000 T Points", "8000 TPoints", "8000 points"
  const tpointsRegex = /([\d,_.]+)\s*(?:T\s*Points|TPoints|T-Points|Tpoints|T points|TPoints!|T Points!)/i;
  const m1 = text.match(tpointsRegex);
  if (m1 && m1[1]) {
    const cleaned = m1[1].replace(/[,_]/g, "");
    const n = Number(cleaned);
    if (!Number.isNaN(n)) return n;
  }

  // Fallback: look for "score" or just the first number
  const scoreRegex = /score\s*(?:is|:)?\s*([\d,_.]+)/i;
  const m2 = text.match(scoreRegex);
  if (m2 && m2[1]) {
    const cleaned = m2[1].replace(/[,_]/g, "");
    const n = Number(cleaned);
    if (!Number.isNaN(n)) return n;
  }

  // Last fallback: any number in the text (but avoid timestamps like 2025-xx)
  const anyNumber = text.match(/([\d,_.]{2,7})/);
  if (anyNumber && anyNumber[1]) {
    const cleaned = anyNumber[1].replace(/[,_]/g, "");
    const n = Number(cleaned);
    if (!Number.isNaN(n)) return n;
  }

  return null;
}
