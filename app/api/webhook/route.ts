import { NextRequest, NextResponse } from 'next/server';

// Minimal webhook endpoint for Farcaster Mini App events.
// For now we just validate JSON and return 200 OK.
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    console.log('[webhook] received', text.slice(0, 1000));
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // Check for notification events
    const event = payload?.event;
    const details = payload?.notificationDetails;
    if ((event === 'miniapp_added' || event === 'notifications_enabled') && details?.notificationUrl && details?.token) {
      // Send claim notification
      try {
        await fetch(details.notificationUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${details.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notificationId: 'daily-claim-1000-triv',
            title: 'Claim your daily 1000 $TRIV!',
            body: 'Tap to claim your daily reward in Triviacast.',
            targetUrl: 'https://triviacast.xyz/claim'
          })
        });
        console.log('[webhook] Sent claim notification');
      } catch (err) {
        console.error('[webhook] Failed to send notification', err);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[webhook] error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 400 });
  }
}

export const dynamic = 'force-dynamic';
