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
      // Lookup by Farcaster username using Neynar API (bulk-by-username)
      const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
      const resp = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-username?usernames=${username}`,
        {
          headers: {
            accept: 'application/json',
            ...(apiKey ? { 'X-API-KEY': apiKey, api_key: apiKey } : {}),
          },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        // Data shape: { [username]: [userObj] }
        const users = data?.[username] || [];
        if (Array.isArray(users) && users.length > 0 && users[0].custody_address) {
          resolvedAddress = users[0].custody_address;
        } else {
          // Username not found
          return NextResponse.json({ error: 'Farcaster username not found', found: false, profile: null }, { status: 404 });
        }
      } else {
        // Username lookup failed (upstream error)
        const errorText = await resp.text();
        return NextResponse.json({ error: `Neynar API error: ${resp.status} ${errorText}` }, { status: 502 });
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
