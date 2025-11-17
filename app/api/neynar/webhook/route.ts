"use server";
import { NextResponse } from "next/server";
import { publishCast, parseScoreFromText } from "@/lib/neynar";
import fs from "fs/promises";
import path from "path";

// Challenge trigger token to qualify casts as Triviacast challenges.
// Default matches the inserted compose token. Override via env TRIVIA_CHALLENGE_TOKEN.
const CHALLENGE_TOKEN = (process.env.TRIVIA_CHALLENGE_TOKEN || "$(triviacastchallenge)").toLowerCase();

// File to store announced winner pair keys for idempotency (avoid duplicate announcements & extra API calls)
const WINNER_PAIRS_PATH = path.join(process.cwd(), "data", "winner_pairs.json");

async function readWinnerPairs(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(WINNER_PAIRS_PATH, "utf-8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr);
    return new Set();
  } catch {
    return new Set();
  }
}

async function writeWinnerPairs(set: Set<string>) {
  try {
    await fs.mkdir(path.dirname(WINNER_PAIRS_PATH), { recursive: true });
    await fs.writeFile(WINNER_PAIRS_PATH, JSON.stringify([...set], null, 2), "utf-8");
  } catch {}
}

type NeynarWebhookPayload = {
  type?: string;
  event?: string;
  data?: any;
};

export async function POST(req: Request) {
  try {
    const payload: NeynarWebhookPayload = await req.json().catch(() => ({} as any));
    const eventType = payload.type || payload.event || (payload.data && payload.data.type) || null;

    // Accept both shapes: top-level type or payload.data.type
    const castEvent =
      eventType === "cast.created" ||
      (payload.data && (payload.data.type === "cast.created" || payload.data.event === "cast.created"));

    if (!castEvent) {
      return NextResponse.json({ ok: true, message: "ignored non-cast.created event" }, { status: 200 });
    }

    const cast = payload.data?.cast || payload.data || payload;
    if (!cast || !cast.hash) {
      return NextResponse.json({ ok: false, message: "invalid cast payload" }, { status: 400 });
    }

    const castHash: string = cast.hash;
    const authorFid: number = cast.author?.fid ?? cast.author_fid ?? cast.fid ?? null;
    const authorUsername: string | null = (cast.author?.username || cast.author_username || null) as string | null;
    const text: string = String(cast.text ?? "");
    const timestamp = cast.timestamp ?? new Date().toISOString();

    const mentionedProfiles: Array<any> = Array.isArray(cast.mentioned_profiles) ? cast.mentioned_profiles : [];
    if (!mentionedProfiles.length) {
      return NextResponse.json({ ok: true, message: "ignored: no mentions" }, { status: 200 });
    }

    // Collect mentioned fids and usernames (best-effort)
    const mentioned = mentionedProfiles.map((p) => ({
      fid: Number(p.fid),
      username: p.username?.replace(/^@/, "") ?? null,
      displayName: p.displayName ?? null,
    }));

    // Track unique mentioned usernames for quick checks
    const mentionedUsernames = new Set(
      mentioned.map((m) => (m.username ? String(m.username) : null)).filter(Boolean) as string[]
    );

    // Only proceed if challenge token present to reduce credit usage
    const hasToken = text.toLowerCase().includes(CHALLENGE_TOKEN);
    if (!hasToken) {
      return NextResponse.json({ ok: true, message: "ignored: missing challenge token" }, { status: 200 });
    }

    // Attempt to parse a Triviacast quiz score from the text
    const score = parseScoreFromText(text); // may be null

    // No longer storing leaderboard data locally. All leaderboard logic should use live API calls.

    // Acknowledge the challenge when at least one opponent is mentioned.
    // Tag BOTH participants in the ack: the author and the first opponent.
    const opponent = mentioned.find((m) => m.username && m.username !== authorUsername) || mentioned[0];
    if (opponent) {
      const mentionA = authorUsername ? `@${authorUsername}` : `FID ${authorFid}`;
      const mentionB = opponent.username ? `@${opponent.username}` : `FID ${opponent.fid}`;
      const ackText = `Challenge detected between ${mentionA} and ${mentionB}. Watching for the reply to announce a winner. #Triviacast`;
      try {
        await publishCast({ text: ackText, parent: castHash, parent_author_fid: authorFid });
      } catch (err) {
        console.error("ack publish error", err);
      }
    }

    // Note: local persistent `store` was removed. If you want automatic winner
    // announcements based on reciprocal casts, we need to query Neynar for recent
    // casts from the mentioned user(s) that mention the current author and
    // contain the challenge token. For now, with storage removed we do not
    // attempt automatic winner announcements here to avoid false positives.

    // Otherwise, optionally reply acknowledging we recorded the challenge (this is optional).
    // Here we respond only with 200 and leave announcing for when reciprocal completes.
    return NextResponse.json({ ok: true, message: "stored challenge share" }, { status: 200 });
  } catch (err) {
    console.error("webhook handler error", err);
    return NextResponse.json({ ok: false, message: "internal error", error: String(err) }, { status: 500 });
  }
}
