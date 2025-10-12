import { NextRequest, NextResponse } from 'next/server';
import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node';

// Webhook endpoint for Farcaster Mini App events with signature verification
export async function POST(req: NextRequest) {
  try {
    // Get the raw request body as base64 encoded JSON Farcaster Signature
    const requestJson = await req.text();

    // Verify the webhook signature
    let verifiedPayload;
    try {
      verifiedPayload = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      console.error('[webhook] Signature verification failed:', err?.name || err?.message || 'Unknown error');
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
    }

    // Log verified event (without sensitive data)
    console.log('[webhook] Verified event:', verifiedPayload.event);

    // Check for notification events
    const payload = verifiedPayload as any;
    if ((payload.event === 'miniapp_added' || payload.event === 'notifications_enabled') &&
        payload.notificationDetails?.url && payload.notificationDetails?.token) {
      const details = payload.notificationDetails;
        // Validate notification URL to prevent SSRF
        const allowedHosts = [
          'api.farcaster.xyz',
          'api.warpcast.com'
        ];

        let notificationUrl: URL;
        try {
          notificationUrl = new URL(details.url);
        } catch {
          console.error('[webhook] Invalid notification URL format');
          return NextResponse.json({ ok: false, error: 'Invalid notification URL' }, { status: 400 });
        }

        // Check if host is in allowlist
        if (!allowedHosts.includes(notificationUrl.hostname)) {
          console.error('[webhook] Notification URL host not allowed:', notificationUrl.hostname);
          return NextResponse.json({ ok: false, error: 'Notification URL not allowed' }, { status: 403 });
        }

        // Send claim notification
        try {
          await fetch(details.url, {
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
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('[webhook] error', err?.message || 'unknown');
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 400 });
  }
}

export const dynamic = 'force-dynamic';
