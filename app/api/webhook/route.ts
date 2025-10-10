import { NextRequest, NextResponse } from 'next/server';

// Minimal webhook endpoint for Farcaster Mini App events.
// For now we just validate JSON and return 200 OK.
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    // Log a truncated payload to avoid noisy logs
    console.log('[webhook] received', text.slice(0, 1000));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[webhook] error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 400 });
  }
}

export const dynamic = 'force-dynamic';
