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

    // If there is a reciprocal challenge (someone previously challenged the current author),
    // check for any record where a mentioned fid previously posted and mentioned this author.
    // We'll look for latest reciprocal entry (most recent) and compare scores.
    // Reciprocal: existing.authorFid === mentioned_fid_of_current && existing.mentioned contains current author fid
    const reciprocal = store
      .slice() // copy
      .reverse()
      .find((e: any) => {
        if (!e || !Array.isArray(e.mentioned) || !e.authorFid) return false;
        const mentionsCurrentAuthor = e.mentioned.some((m: any) => Number(m.fid) === Number(authorFid));
        const authoredByMentioned = mentioned.some((m) => Number(m.fid) === Number(e.authorFid));
        // ensure we don't match the same cast
        const differentCast = e.castHash !== castHash;
        return mentionsCurrentAuthor && authoredByMentioned && differentCast;
      });

    // If reciprocal found and both sides have scores, compare and publish a winner announcement
    if (reciprocal && reciprocal.score != null && score != null) {
      // Idempotency: avoid duplicate winner announcements for same pair
      const winnerPairs = await readWinnerPairs();
      const pairKey = [authorFid, reciprocal.authorFid].sort((a, b) => Number(a) - Number(b)).join(":");
      if (winnerPairs.has(pairKey)) {
        return NextResponse.json({ ok: true, message: "winner already announced for pair", pairKey }, { status: 200 });
      }
      // Determine winner
      const aScore = score;
      const bScore = reciprocal.score;
      let resultText = "";
      // a = current author; b = reciprocal author
      const a = { fid: authorFid, username: authorUsername ?? null };
      const b = { fid: reciprocal.authorFid, username: reciprocal.authorUsername ?? null };

      // Build mention strings preferring @username when available
      const mentionA = a.username ? `@${a.username}` : `FID ${a.fid}`;
      const mentionB = b.username ? `@${b.username}` : `FID ${b.fid}`;

      if (aScore > bScore) {
        resultText = `${mentionA} beat ${mentionB}! Final: ${aScore.toLocaleString()} vs ${bScore.toLocaleString()} — who can top them? #Triviacast`;
      } else if (bScore > aScore) {
        resultText = `${mentionB} beat ${mentionA}! Final: ${bScore.toLocaleString()} vs ${aScore.toLocaleString()} — rematch? #Triviacast`;
      } else {
        resultText = `${mentionA} and ${mentionB} tied at ${aScore.toLocaleString()} T Points! Who will break the tie? #Triviacast`;
      }

      // Reply to BOTH casts: the current cast and the reciprocal cast
      const parents = [
        { parent: castHash as string, parent_author_fid: authorFid as number },
        { parent: reciprocal.castHash as string, parent_author_fid: reciprocal.authorFid as number },
      ];

      try {
        const results = [] as any[];
        for (const p of parents) {
          try {
            const r = await publishCast({ text: resultText, parent: p.parent, parent_author_fid: p.parent_author_fid });
            results.push({ parent: p.parent, ok: true, res: r });
          } catch (err) {
            console.error("winner publish error", err);
            results.push({ parent: p.parent, ok: false, error: String(err) });
          }
        }
        winnerPairs.add(pairKey);
        await writeWinnerPairs(winnerPairs);
        return NextResponse.json({ ok: true, message: "stored & announced winner (idempotent)", pairKey, results }, { status: 200 });
      } catch (err: any) {
        console.error("publish error", err);
        return NextResponse.json({ ok: false, message: "failed to publish announcement", error: String(err) }, { status: 500 });
      }
    }

    // Otherwise, optionally reply acknowledging we recorded the challenge (this is optional).
    // Here we respond only with 200 and leave announcing for when reciprocal completes.
    return NextResponse.json({ ok: true, message: "stored challenge share" }, { status: 200 });
  } catch (err) {
    console.error("webhook handler error", err);
    return NextResponse.json({ ok: false, message: "internal error", error: String(err) }, { status: 500 });
  }
}
