// Removed "use server" directive to avoid build error with constant export
import { NextResponse } from "next/server";
import { publishCast } from "@/lib/neynar";

// GET /api/neynar/verify-signer
// Query params:
//   cast=1            -> attempt ephemeral publish (short text) to confirm signer can post
//   token=XYZ          -> optional append to text so you can find/delete manually
//   skipPublish=1      -> force metadata-only dry-run (default behavior)
// Returns signer metadata and (optionally) test cast hash.
export async function GET(req: Request) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;
  if (!apiKey || !signerUuid) {
    return NextResponse.json(
      { ok: false, error: "Missing NEYNAR_API_KEY or NEYNAR_SIGNER_UUID" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const performCast = url.searchParams.get("cast") === "1" && url.searchParams.get("skipPublish") !== "1";
  const token = url.searchParams.get("token") || "verify";

  // Fetch signer metadata first (if endpoint available)
  let signerMeta: any = null;
  try {
    const metaResp = await fetch(
      `https://api.neynar.com/v2/farcaster/signer?signer_uuid=${encodeURIComponent(signerUuid)}`,
      { headers: { "x-api-key": apiKey } }
    );
    signerMeta = await metaResp.json().catch(() => ({}));
    if (!metaResp.ok) {
      return NextResponse.json(
        { ok: false, error: "Signer lookup failed", status: metaResp.status, body: signerMeta },
        { status: metaResp.status }
      );
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Signer lookup error", detail: String(e) }, { status: 500 });
  }

  if (!performCast) {
    return NextResponse.json({ ok: true, mode: "dry-run", signer: signerMeta });
  }

  // Attempt minimal publish (ephemeral). Use unique idem text built in publishCast.
  const text = `Triviacast signer check (${token})`; // Small text to avoid length issues
  try {
    const publishRes = await publishCast({ text, channel_id: "neynar" });
    return NextResponse.json({ ok: true, mode: "publish", signer: signerMeta, cast: publishRes.cast }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Publish failed", detail: String(e), signer: signerMeta },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";