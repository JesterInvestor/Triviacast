import { NextRequest, NextResponse } from 'next/server'

// NOTE: This is a stub endpoint. In production, validate wallet ownership, enforce daily limit server-side
// against a durable store, and return a signed payload or call a contract from a relayer.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { address?: string; prize?: number; label?: string }
    // For now, just echo back. No persistence.
    return NextResponse.json({ ok: true, echo: body, note: 'Stub only - no awarding performed' })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
}
