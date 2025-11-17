import { NextResponse } from "next/server";

// Webhook endpoint no longer performs bot actions. Keep as a safe, non-publishing
// handler to accept Neynar webhook calls without invoking any automated bot logic.
export async function POST(req: Request) {
  try {
    // Accept the payload for logging/inspection if needed, but do not act on it.
    // Read body to drain the request (best-effort)
    await req.json().catch(() => null);
    return NextResponse.json({ ok: true, message: 'bot features disabled: webhook received and ignored' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
