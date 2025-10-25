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

      // Prefer using the official Neynar SDK when available
      try {
        const mod = await import('@neynar/nodejs-sdk');
        const { NeynarAPIClient, Configuration, isApiErrorResponse } = mod as any;
        const client = new NeynarAPIClient(new Configuration({ apiKey }));

        // SDK method name varies by version; try lookupUserByUsername signature first
        let sdkResp: any = null;
        if (typeof client.lookupUserByUsername === 'function') {
          try {
            sdkResp = await client.lookupUserByUsername({ username });
          } catch (e) {
            // some versions return a wrapped result
            sdkResp = e?.response || null;
          }
        }

        // If we got a result from SDK, normalize it
        if (sdkResp) {
          const result = sdkResp.result || sdkResp.user || sdkResp.users?.[0] || sdkResp;
          const user = result;
          if (!user) {
            return NextResponse.json({ error: 'Farcaster username not found', found: false, profile: null }, { status: 404 });
          }
          resolvedAddress = (user?.custody_address as string | undefined) || resolvedAddress || null;
          profile = {
            address: resolvedAddress || undefined,
            username: user.username ? `@${String(user.username).replace(/^@/, '')}` : undefined,
            pfpUrl: user.pfp_url || user.pfpUrl || user.avatar || user.profile?.pfpUrl || undefined,
            displayName: user.display_name || user.displayName || user.name || undefined,
            bio: user.profile?.bio?.text || user.bio || undefined,
            followers: user.follower_count ?? user.followers ?? undefined,
            following: user.following_count ?? user.following ?? undefined,
            hasPowerBadge: !!(user.power_badge || user.hasPowerBadge || user.powerBadge),
            raw: user,
          };
        } else {
          // If SDK not available or didn't return data, fall back to HTTP GET to the documented endpoint
          const resp = await fetch(`https://api.neynar.com/v2/farcaster/user/by_username/?username=${encodeURIComponent(username)}`, {
            headers: {
              accept: 'application/json',
              ...(apiKey ? { 'X-API-KEY': apiKey, api_key: apiKey } : {}),
            },
          });

          if (!resp.ok) {
            const errorText = await resp.text().catch(() => '');
            return NextResponse.json({ error: `Neynar API error: ${resp.status} ${errorText}` }, { status: 502 });
          }
          const data = await resp.json();
          // documented shape: { result: { ...user fields... } }
          const user = data?.result || data?.user || data?.users?.[0] || data;
          if (!user) {
            return NextResponse.json({ error: 'Farcaster username not found', found: false, profile: null }, { status: 404 });
          }
          resolvedAddress = (user?.custody_address as string | undefined) || resolvedAddress || null;
          profile = {
            address: resolvedAddress || undefined,
            username: user.username ? `@${String(user.username).replace(/^@/, '')}` : undefined,
            pfpUrl: user.pfp_url || user.pfpUrl || user.avatar || user.profile?.pfpUrl || undefined,
            displayName: user.display_name || user.displayName || user.name || undefined,
            bio: user.profile?.bio?.text || user.bio || undefined,
            followers: user.follower_count ?? user.followers ?? undefined,
            following: user.following_count ?? user.following ?? undefined,
            hasPowerBadge: !!(user.power_badge || user.hasPowerBadge || user.powerBadge),
            raw: user,
          };
        }
      } catch (e) {
        // If SDK import fails, attempt the HTTP fallback
        try {
          const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
          const resp = await fetch(`https://api.neynar.com/v2/farcaster/user/by_username/?username=${encodeURIComponent(username)}`, {
            headers: {
              accept: 'application/json',
              ...(apiKey ? { 'X-API-KEY': apiKey, api_key: apiKey } : {}),
            },
          });
          if (!resp.ok) {
            const errorText = await resp.text().catch(() => '');
            return NextResponse.json({ error: `Neynar API error: ${resp.status} ${errorText}` }, { status: 502 });
          }
          const data = await resp.json();
          const user = data?.result || data?.user || data?.users?.[0] || data;
          if (!user) {
            return NextResponse.json({ error: 'Farcaster username not found', found: false, profile: null }, { status: 404 });
          }
          resolvedAddress = (user?.custody_address as string | undefined) || resolvedAddress || null;
          profile = {
            address: resolvedAddress || undefined,
            username: user.username ? `@${String(user.username).replace(/^@/, '')}` : undefined,
            pfpUrl: user.pfp_url || user.pfpUrl || user.avatar || user.profile?.pfpUrl || undefined,
            displayName: user.display_name || user.displayName || user.name || undefined,
            bio: user.profile?.bio?.text || user.bio || undefined,
            followers: user.follower_count ?? user.followers ?? undefined,
            following: user.following_count ?? user.following ?? undefined,
            hasPowerBadge: !!(user.power_badge || user.hasPowerBadge || user.powerBadge),
            raw: user,
          };
        } catch (ee) {
          console.error('Error looking up username with Neynar fallback', ee);
          return NextResponse.json({ error: 'Neynar username lookup failed' }, { status: 502 });
        }
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
