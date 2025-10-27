import { NextResponse } from "next/server";

// Simple in-memory rate limiter (dev). Per-IP, max 6 requests per minute.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 6;
const rateMap = new Map<string, { ts: number; count: number }>();

function rateLimit(ip: string) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.ts > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(ip, { ts: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const payload = await req.json();
    // Basic validation
    if (!payload || !payload.to || !payload.registerSig) {
      return NextResponse.json({ error: 'Missing required fields (to, registerSig)' }, { status: 400 });
    }

    // If a FARCASTER_BUNDLER_URL is provided, forward the request to it so a
    // production bundler service can handle the register call and app pays the fee.
    if (process.env.FARCASTER_BUNDLER_URL) {
      try {
        const bundlerUrl = String(process.env.FARCASTER_BUNDLER_URL).replace(/\/$/, '');
        const resp = await fetch(bundlerUrl + '/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await resp.text();
        const contentType = resp.headers.get('content-type') || '';
        if (resp.ok) {
          // Try to parse JSON, otherwise return text
          try {
            const json = JSON.parse(body);
            return NextResponse.json(json, { status: 200 });
          } catch (_) {
            return new NextResponse(body, { status: 200 });
          }
        }
        return NextResponse.json({ error: 'Bundler returned error', status: resp.status, body }, { status: 502 });
      } catch (err: unknown) {
        console.error('Error forwarding to bundler', err);
        return NextResponse.json({ error: 'Error forwarding to bundler' }, { status: 502 });
      }
    }

    // If Neynar is configured and the payload looks like a signed-key registration
    // (contains signerUuid & signature), attempt to register via Neynar's API.
    if (process.env.NEYNAR_API_KEY && payload?.signerUuid && payload?.signature) {
      try {
        const neynarClient = (await import('@/lib/neynarClient')).default;
        const resp = await (neynarClient as any).registerSignedKey({ signerUuid: payload.signerUuid, appFid: payload.appFid, deadline: payload.deadline, signature: payload.signature });
        return NextResponse.json({ result: resp, note: 'Registered via Neynar API' });
      } catch (err) {
        console.error('neynar registerSignedKey failed', err);
        return NextResponse.json({ error: 'Failed to register via Neynar' }, { status: 502 });
      }
    }

    // No bundler configured: return a helpful error indicating required production config.
    console.info('[farcaster/register] dev-mode payload (no bundler configured)', { payload });
    return NextResponse.json({ error: 'FARCASTER_BUNDLER_URL not configured. Set FARCASTER_BUNDLER_URL to forward to a bundler or configure a bundler service.', dev: true }, { status: 501 });
  } catch (err: unknown) {
    console.error('register endpoint error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
