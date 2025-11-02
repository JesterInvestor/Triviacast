import { NextRequest, NextResponse } from 'next/server';

// Basic in-memory rate limiter stub. In production replace with a
// persistent store (Redis) and a robust library.
const rateMap = new Map<string, { count: number; firstTs: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max requests per window per user/ip

/**
 * POST /api/send-result
 *
 * Body: { targetHandle?: string, targetFid?: number, quizId: string, score: number, details?: any }
 *
 * This route builds a cast text and forwards it to your NEYNAR backend to sign & publish.
 * It expects NEYNAR_API_BASE, NEYNAR_API_KEY and NEYNAR_BACKEND_SIGNER_UUID to be set as env vars.
 */

export async function POST(request: NextRequest) {
  // Basic auth guard: require either `authorization` header or `x-neynar-user` header.
  const authHeader = request.headers.get('authorization');
  const neynarUser = request.headers.get('x-neynar-user');
  if (!authHeader && !neynarUser) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  // Rate limiter key: prefer authenticated user id, else fall back to IP address.
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const key = neynarUser || ip || 'anon';
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry) {
    rateMap.set(key, { count: 1, firstTs: now });
  } else {
    if (now - entry.firstTs > RATE_LIMIT_WINDOW) {
      // reset
      rateMap.set(key, { count: 1, firstTs: now });
    } else {
      entry.count += 1;
      if (entry.count > RATE_LIMIT_MAX) {
        return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 });
      }
      rateMap.set(key, entry);
    }
  }

  const body = await request.json().catch(() => ({}));
  const { targetHandle, targetFid, quizId, score, details } = body as {
    targetHandle?: string;
    targetFid?: number;
    quizId?: string;
    score?: number;
    details?: any;
  };

  if (!quizId || typeof score !== 'number' || (!targetHandle && !targetFid)) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const base = process.env.NEYNAR_API_BASE;
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_BACKEND_SIGNER_UUID;

  if (!base || !apiKey || !signerUuid) {
    return NextResponse.json({ error: 'NEYNAR_API_BASE / NEYNAR_API_KEY / NEYNAR_BACKEND_SIGNER_UUID must be configured' }, { status: 500 });
  }

  const targetMention = targetHandle ? `@${targetHandle}` : `fid:${targetFid}`;
  const text = `Quiz result for ${targetMention}: I scored ${score} on ${quizId}. Try it on Triviacast!`;

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/casts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ signerUuid, text, mention: targetHandle || null, metadata: { quizId, score, details } }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'failed to send result', details: String(err) }, { status: 500 });
  }
}
