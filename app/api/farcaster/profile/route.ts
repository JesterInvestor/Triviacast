import { NextResponse } from 'next/server';
import { resolveFarcasterProfile } from '@/lib/addressResolver';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const address = typeof body?.address === 'string' ? body.address.trim() : null;
    const username = typeof body?.username === 'string' ? body.username.trim().replace(/^@/, '') : null;

    let profile = null;
    let resolvedAddress = address;
    if (username) {
      // Lookup by Farcaster username using Neynar API
      const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
      const resp = await fetch(
        `https://api.neynar.com/v2/farcaster/user-by-username?username=${username}`,
        {
          headers: {
            accept: 'application/json',
            ...(apiKey ? { 'X-API-KEY': apiKey, api_key: apiKey } : {}),
          },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.result && data.result.custody_address) {
          resolvedAddress = data.result.custody_address;
        } else {
          // Username not found
          return NextResponse.json({ found: false, profile: null }, { status: 200 });
        }
      } else {
        // Username lookup failed
        return NextResponse.json({ error: 'username lookup failed' }, { status: 500 });
      }
    }
    if (resolvedAddress) {
      profile = await resolveFarcasterProfile(resolvedAddress);
    }

    if (!username && !address) {
      return NextResponse.json({ error: 'username or address required' }, { status: 400 });
    }
    if (!profile) return NextResponse.json({ found: false, profile: null }, { status: 200 });
    return NextResponse.json({ found: true, profile }, { status: 200 });
  } catch (e) {
    console.error('Error in /api/farcaster/profile', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
