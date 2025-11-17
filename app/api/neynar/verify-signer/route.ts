// Removed "use server" directive to avoid build error with constant export
import { NextResponse } from "next/server";

// Verify-signer endpoint no longer attempts to publish or manage a bot signer.
// Keep a simple metadata-only response to check configured env vars if needed.
export async function GET(req: Request) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;
  return NextResponse.json({ ok: true, message: 'bot features disabled: verify-signer is a metadata-only endpoint', env: { hasApiKey: Boolean(apiKey), hasSignerUuid: Boolean(signerUuid) } });
}

export const dynamic = "force-dynamic";