import { NextResponse } from 'next/server';
import { resolveFarcasterProfile } from '@/lib/addressResolver';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const address = typeof body?.address === 'string' ? body.address.trim() : null;
    const username = typeof body?.username === 'string' ? body.username.trim().replace(/^@/, '') : null;

    let profile = null;
    let resolvedAddress = address;

    // If username provided, prefer getting the full user record from Neynar and build a richer profile
    if (username) {
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
        const users = data?.[username] || [];
        if (!Array.isArray(users) || users.length === 0) {
          return NextResponse.json({ error: 'Farcaster username not found', found: false, profile: null }, { status: 404 });
        }

        const user = users[0] as Record<string, any>;
        // Pull custody address if present
        resolvedAddress = (user?.custody_address as string | undefined) || resolvedAddress || null;

        // Build a richer profile object directly from the Neynar user object
        profile = {
          address: resolvedAddress || undefined,
          username: user.username ? `@${String(user.username).replace(/^@/, '')}` : undefined,
          pfpUrl: (user.pfpUrl as string | undefined) || (user.avatar as string | undefined) || (user.profile?.pfpUrl as string | undefined) || undefined,
          displayName: (user.displayName as string | undefined) || (user.name as string | undefined) || undefined,
          bio: (user.bio as string | undefined) || (user.profile?.bio as string | undefined) || undefined,
          followers: typeof user.followers === 'number' ? user.followers : (user.follower_count as number | undefined),
          following: typeof user.following === 'number' ? user.following : (user.following_count as number | undefined),
          hasPowerBadge: !!(user.hasPowerBadge || user.powerBadge),
          raw: user,
        };
      } else {
        const errorText = await resp.text();
        return NextResponse.json({ error: `Neynar API error: ${resp.status} ${errorText}` }, { status: 502 });
      }
    }

    // If we still don't have a profile but have an address, call resolver to get a minimal profile
    if (!profile && resolvedAddress) {
      const resolved = await resolveFarcasterProfile(resolvedAddress);
      if (resolved) {
        profile = {
          address: resolvedAddress,
          username: resolved.username,
          pfpUrl: resolved.pfpUrl,
          displayName: resolved.displayName,
          bio: resolved.bio,
          followers: resolved.followers,
          following: resolved.following,
          hasPowerBadge: resolved.hasPowerBadge,
          raw: resolved.raw || undefined,
        };
      }
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
