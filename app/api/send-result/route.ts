import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/send-result
 *
 * Body: { targetHandle?: string, targetFid?: number, quizId: string, score: number, details?: any }
 *
 * This route builds a cast text and forwards it to your NEYNAR backend to sign & publish.
 * It expects NEYNAR_API_BASE, NEYNAR_API_KEY and NEYNAR_BACKEND_SIGNER_UUID to be set as env vars.
 */

export async function POST(request: NextRequest) {
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
