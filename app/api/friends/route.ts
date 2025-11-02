import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/friends?address=<walletAddress>
 *
 * Proxy to NEYNAR backend to fetch follows. Expects NEYNAR_API_BASE and NEYNAR_API_KEY
 * to be set in environment (Vercel secrets). If you prefer using the SDK, we can
 * swap this to use @neynar/nodejs-sdk instead.
 */

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const address = url.searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'missing address query param' }, { status: 400 });
  }

  const base = process.env.NEYNAR_API_BASE;
  const apiKey = process.env.NEYNAR_API_KEY;

  if (!base || !apiKey) {
    return NextResponse.json({ error: 'NEYNAR_API_BASE or NEYNAR_API_KEY not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/follows?address=${encodeURIComponent(address)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'failed to fetch follows', details: String(err) }, { status: 500 });
  }
}
