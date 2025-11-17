import { NextResponse } from 'next/server';
import { resolveFarcasterProfile } from '@/lib/addressResolver';
import { resolveAvatarUrl } from '@/lib/avatar';

// POST /api/farcaster/profile
// Accepts JSON { username?: string, address?: string }
// Prefers username lookup via Neynar (SDK if available, HTTP fallback),
// falls back to resolveFarcasterProfile(address) when only address is available.
// Returns a normalized profile object directly.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const address = typeof body?.address === 'string' ? body.address.trim() : null;
    const username = typeof body?.username === 'string' ? body.username.trim().replace(/^@/, '').replace(/(?:\.farcaster\.eth|\.eth)$/i, '') : null;

    if (!username && !address) {
      return NextResponse.json({ error: 'username or address required' }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

    let profile: any = null;
    let resolvedAddress = address || null;

    // If username provided, try to get full user from Neynar
    if (username) {
      // Try SDK first (optional dependency)
      try {
        const mod: any = await import('@neynar/nodejs-sdk');
        const { NeynarAPIClient, Configuration } = mod;
        const client = new NeynarAPIClient(new Configuration({ apiKey }));

        let sdkResp: any = null;
        if (typeof client.lookupUserByUsername === 'function') {
          sdkResp = await client.lookupUserByUsername({ username });
        }

        // If SDK didn't return, fall through to HTTP fallback below
        if (sdkResp) {
          const user = sdkResp?.result || sdkResp?.user || sdkResp?.users?.[0] || sdkResp;
          if (user) {
            resolvedAddress = user?.custody_address || resolvedAddress || null;
            profile = normalizeUserToProfile(user, resolvedAddress);
          }
        }
      } catch (e) {
        // ignore and fallback to HTTP below
      }

      // HTTP fallback
      if (!profile) {
        try {
          const resp = await fetch(
            `https://api.neynar.com/v2/farcaster/user/by_username/?username=${encodeURIComponent(username)}`,
            {
              headers: { accept: 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}) },
            }
          );
          if (!resp.ok) {
            return NextResponse.json({ error: `Neynar API error: ${resp.status}` }, { status: 502 });
          }
          const data = await resp.json();
          const user = data?.result || data?.user || data?.users?.[0] || data;
          if (user) {
            resolvedAddress = user?.custody_address || resolvedAddress || null;
            profile = normalizeUserToProfile(user, resolvedAddress);
          }
        } catch (e) {
          console.error('Neynar HTTP lookup failed', e);
          return NextResponse.json({ error: 'Neynar lookup failed' }, { status: 502 });
        }
      }
    }

    // If we still don't have a profile but have an address, resolve via lib
    if (!profile && resolvedAddress) {
      const resolved = await resolveFarcasterProfile(resolvedAddress);
      if (resolved) profile = normalizeResolvedToProfile(resolved, resolvedAddress);
    }

    if (!profile) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Best-effort: fetch up to 5 recent casts and attach to profile
    try {
      // FIX: prefer normalized profile.fid, fall back to raw fid for compatibility
      const fid = profile.fid ?? profile.raw?.fid;
      if (fid) {
        const casts = await fetchRecentCastsForFid(String(fid), apiKey, 5);
        profile.casts = casts;
      }
    } catch (e) {
      // non-fatal — leave profile without casts
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (e) {
    console.error('Error in /api/farcaster/profile', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

function normalizeUserToProfile(user: any, resolvedAddress: string | null) {
  const src = user.pfp_url || user.pfpUrl || user.avatar || user.profile?.pfpUrl || undefined;
  return {
    address: resolvedAddress || undefined,
    username: user.username ? `@${String(user.username).replace(/^@/, '').replace(/(?:\.farcaster\.eth|\.eth)$/i, '')}` : undefined,
    pfpUrl: resolveAvatarUrl(src) || undefined,
    displayName: user.display_name || user.displayName || user.name || undefined,
    bio: user.profile?.bio?.text || user.bio || undefined,
    followers: user.follower_count ?? user.followers ?? undefined,
    following: user.following_count ?? user.following ?? undefined,
    hasPowerBadge: !!(user.power_badge || user.hasPowerBadge || user.powerBadge),
    fid: user.fid || user.FID || user.profile?.fid || undefined,
    raw: user,
  };
}

function normalizeResolvedToProfile(resolved: any, resolvedAddress: string) {
  const src = resolved.pfpUrl || resolved.raw?.pfpUrl || undefined;
  return {
    address: resolvedAddress,
    username: resolved.username,
    pfpUrl: resolveAvatarUrl(src) || undefined,
    displayName: resolved.displayName,
    bio: resolved.bio,
    followers: resolved.followers,
    following: resolved.following,
    hasPowerBadge: resolved.hasPowerBadge,
    fid: resolved.raw?.fid || resolved.fid || undefined,
    raw: resolved.raw || undefined,
  };
}

async function fetchRecentCastsForFid(fid: string, apiKey: string | undefined, limit = 5) {
  // Try SDK first
  try {
    const mod: any = await import('@neynar/nodejs-sdk');
    const { NeynarAPIClient, Configuration } = mod;
    const client = new NeynarAPIClient(new Configuration({ apiKey }));
    let sdkResp: any = null;
    if (typeof client.fetchCastsByFid === 'function') sdkResp = await client.fetchCastsByFid({ fid, limit });
    else if (typeof client.fetchCasts === 'function') sdkResp = await client.fetchCasts({ fid, limit });
    else if (typeof client.fetchCastsByUser === 'function') sdkResp = await client.fetchCastsByUser({ fid, limit });

    const arr = sdkResp?.result?.casts || sdkResp?.casts || sdkResp?.result || sdkResp;
    if (Array.isArray(arr)) return arr.slice(0, limit).map(normalizeCast);
  } catch (e) {
    // ignore
  }

  // Try HTTP fallbacks
  const tryUrls = [
    `https://api.neynar.com/v2/farcaster/casts?fid=${encodeURIComponent(fid)}&limit=${limit}`,
    `https://api.neynar.com/v2/farcaster/cast/by_fid?fid=${encodeURIComponent(fid)}&limit=${limit}`,
    `https://api.neynar.com/v2/farcaster/cast/by_user?fid=${encodeURIComponent(fid)}&limit=${limit}`,
  ];
  for (const url of tryUrls) {
    try {
      const resp = await fetch(url, { headers: { accept: 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}) } });
      if (!resp.ok) continue;
      const data = await resp.json();
      const arr = data?.result?.casts || data?.casts || data?.result || data;
      if (Array.isArray(arr) && arr.length > 0) return arr.slice(0, limit).map(normalizeCast);
    } catch (e) {
      // try next
    }
  }
  return [];
}

function normalizeCast(c: any) {
  return {
    hash: c.hash || c.castHash || c.cast_hash || c.cast_hash_hex || c.hash_hex || null,
    text: c.text || c.body || c.embed?.text || (c.data && c.data.text) || null,
    timestamp: c.timestamp || c.created_at || c.createdAt || null,
    embeds: c.embed ? (Array.isArray(c.embed) ? c.embed : [c.embed]) : c.embeds || null,
    raw: c,
  };
}