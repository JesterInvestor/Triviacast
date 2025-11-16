"use server";
import { NextResponse } from "next/server";
import { readStore, writeStore, publishCast, parseScoreFromText } from "@/lib/neynar";

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
    const text: string = String(cast.text ?? "");
    const timestamp = cast.timestamp ?? new Date().toISOString();

    const mentionedProfiles: Array<any> = Array.isArray(cast.mentioned_profiles) ? cast.mentioned_profiles : [];
    if (!mentionedProfiles.length) {
      // nothing to do if nobody was mentioned
      return NextResponse.json({ ok: true, message: "no mentioned profiles" }, { status: 200 });
    }

    // Collect mentioned fids and usernames (best-effort)
    const mentioned = mentionedProfiles.map((p) => ({
      fid: Number(p.fid),
      username: p.username?.replace(/^@/, "") ?? null,
      displayName: p.displayName ?? null,
    }));

    // Attempt to parse a Triviacast quiz score from the text
    const score = parseScoreFromText(text); // may be null

    // Build store entry
    const entry = {
      castHash,
      authorFid,
      mentioned,
      score,
      text,
      timestamp,
    };

    // Read existing store and append
    const store = await readStore();
    store.push(entry);
    await writeStore(store);

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
      // Determine winner
      const aScore = score;
      const bScore = reciprocal.score;
      let resultText = "";
      const a = { fid: authorFid, username: (mentionedProfiles.length ? mentionedProfiles[0].username?.replace(/^@/, "") : null) ?? null };
      const b = { fid: reciprocal.authorFid, username: reciprocal.mentioned?.find((m: any) => m.fid === authorFid)?.username ?? null };

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

      // Use the most recent cast as parent for context (reply to the latest cast among the two)
      const parentHash = castHash; // reply to the current cast
      const parent_author_fid = authorFid;

      try {
        const publishRes = await publishCast({
          text: resultText,
          parent: parentHash,
          parent_author_fid,
        });
        return NextResponse.json({ ok: true, message: "stored and announced winner", publishRes }, { status: 200 });
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
