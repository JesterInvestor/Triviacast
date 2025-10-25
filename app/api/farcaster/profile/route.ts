import { NextResponse } from 'next/server';
import { resolveFarcasterProfile } from '@/lib/addressResolver';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const address = typeof body?.address === 'string' ? body.address.trim() : null;
    const username = typeof body?.username === 'string' ? body.username.trim().replace(/^@/, '') : null;

    let profile: any = null;
    let resolvedAddress = address || null;

    const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

    if (username) {
      // Try SDK dynamic import first, otherwise HTTP fallback
      try {
        const mod: any = await import('@neynar/nodejs-sdk');
        const { NeynarAPIClient, Configuration } = mod;
        const client = new NeynarAPIClient(new Configuration({ apiKey }));

        let sdkResp: any = null;
        if (typeof client.lookupUserByUsername === 'function') {
          sdkResp = await client.lookupUserByUsername({ username });
        }

        if (!sdkResp) {
          const resp = await fetch(
            `https://api.neynar.com/v2/farcaster/user/by_username/?username=${encodeURIComponent(username)}`,
            { headers: { accept: 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}) } }
          );
          if (!resp.ok) {
            const errorText = await resp.text().catch(() => '');
            return NextResponse.json({ error: `Neynar API error: ${resp.status} ${errorText}` }, { status: 502 });
          }
          sdkResp = await resp.json();
        }

        const result = sdkResp?.result || sdkResp?.user || sdkResp?.users?.[0] || sdkResp;
        const user = result;
        if (!user) return NextResponse.json({ error: 'Farcaster username not found' }, { status: 404 });

        resolvedAddress = user?.custody_address || resolvedAddress || null;
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
      } catch (e) {
        // try HTTP fallback if SDK fails
        try {
          const resp = await fetch(
            `https://api.neynar.com/v2/farcaster/user/by_username/?username=${encodeURIComponent(username)}`,
            { headers: { accept: 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}) } }
          );
          if (!resp.ok) {
            const errorText = await resp.text().catch(() => '');
            return NextResponse.json({ error: `Neynar API error: ${resp.status} ${errorText}` }, { status: 502 });
          }
          const data = await resp.json();
          const user = data?.result || data?.user || data?.users?.[0] || data;
          if (!user) return NextResponse.json({ error: 'Farcaster username not found' }, { status: 404 });
          resolvedAddress = user?.custody_address || resolvedAddress || null;
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

    if (!username && !address) return NextResponse.json({ error: 'username or address required' }, { status: 400 });
    if (!profile) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Best-effort: fetch recent casts (up to 5) by fid
    try {
      const fid = profile.raw?.fid;
      const casts: any[] = [];
      if (fid) {
        try {
          const mod: any = await import('@neynar/nodejs-sdk');
          const { NeynarAPIClient, Configuration } = mod;
          const client = new NeynarAPIClient(new Configuration({ apiKey }));
          let sdkResp: any = null;
          if (typeof client.fetchCastsByFid === 'function') {
            sdkResp = await client.fetchCastsByFid({ fid: String(fid), limit: 5 });
          } else if (typeof client.fetchCasts === 'function') {
            sdkResp = await client.fetchCasts({ fid: String(fid), limit: 5 });
          }
          const arr = sdkResp?.result?.casts || sdkResp?.casts || sdkResp?.result || sdkResp;
          if (Array.isArray(arr)) arr.slice(0, 5).forEach((c: any) => casts.push({ hash: c.hash || c.castHash || null, text: c.text || c.body || null, timestamp: c.timestamp || c.created_at || null, raw: c }));
        } catch (e) {
          // ignore SDK errors
        }

        if (profile.casts == null) profile.casts = [];
      }
    } catch (e) {
      // ignore
    }

    // Return profile object only (per request)
    return NextResponse.json(profile, { status: 200 });
  } catch (e) {
    console.error('Error in /api/farcaster/profile', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
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
            // some versions return a wrapped result — cast to any to satisfy TS
            sdkResp = (e as any)?.response || null;
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
    // Try to fetch the user's recent casts (up to 5). This is best-effort — missing API key
    // or missing endpoints will simply result in an empty array.
  const apiKey = (globalThis as any).process?.env?.NEYNAR_API_KEY || (globalThis as any).process?.env?.NEXT_PUBLIC_NEYNAR_API_KEY;
    const normalizeCast = (c: any) => {
      // Normalise varying shapes coming from different Neynar SDK / HTTP shapes
      return {
        hash: c.hash || c.castHash || c.cast_hash || c.cast_hash_hex || c.hash_hex || null,
        text: c.text || c.body || c.embed?.text || (c.data && c.data.text) || null,
        timestamp: c.timestamp || c.created_at || c.createdAt || null,
        embeds: c.embed ? (Array.isArray(c.embed) ? c.embed : [c.embed]) : (c.embeds || null),
        raw: c,
      };
    };

    let casts: any[] = [];
    const fid = profile?.raw?.fid ?? profile?.raw?.fid;
    if (fid) {
      // Try SDK first
        try {
  // dynamic import — optional SDK may not have types; ignore missing types at compile time
          const mod = await import('@neynar/nodejs-sdk');
        const { NeynarAPIClient, Configuration } = mod as any;
        const client = new NeynarAPIClient(new Configuration({ apiKey }));

        let sdkResp: any = null;
        if (typeof client.fetchCastsByFid === 'function') {
          sdkResp = await client.fetchCastsByFid({ fid: String(fid), limit: 5 });
        } else if (typeof client.fetchCasts === 'function') {
          sdkResp = await client.fetchCasts({ fid: String(fid), limit: 5 });
        } else if (typeof client.fetchCastsByUser === 'function') {
          sdkResp = await client.fetchCastsByUser({ fid: String(fid), limit: 5 });
        }

        if (sdkResp) {
          const arr = sdkResp?.result?.casts || sdkResp?.casts || sdkResp?.result || sdkResp;
          if (Array.isArray(arr)) casts = arr.slice(0, 5).map(normalizeCast);
        }
      } catch (e) {
        // ignore SDK errors — we'll try HTTP fallbacks below
      }

      // If SDK didn't yield results, try a few HTTP endpoints Neynar might expose
      if (casts.length === 0) {
        try {
          const tryUrls = [
            `https://api.neynar.com/v2/farcaster/casts?fid=${encodeURIComponent(String(fid))}&limit=5`,
            `https://api.neynar.com/v2/farcaster/cast/by_fid?fid=${encodeURIComponent(String(fid))}&limit=5`,
            `https://api.neynar.com/v2/farcaster/cast/by_user?fid=${encodeURIComponent(String(fid))}&limit=5`,
          ];
          for (const url of tryUrls) {
            try {
              const resp = await fetch(url, {
                headers: {
                  accept: 'application/json',
                  ...(apiKey ? { 'X-API-KEY': apiKey } : {}),
                },
              });
              if (!resp.ok) continue;
              const data = await resp.json();
              const arr = data?.result?.casts || data?.casts || data?.result || data;
              if (Array.isArray(arr) && arr.length > 0) {
                casts = arr.slice(0, 5).map(normalizeCast);
                break;
              }
            } catch (inner) {
              // try next URL
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // Attach casts to the profile (may be empty array)
  if (profile) (profile as any).casts = casts;

    if (!profile) return NextResponse.json({ error: 'not found' }, { status: 404 });
    // Per request: return only the profile object (no wrapper)
    return NextResponse.json(profile, { status: 200 });
  } catch (e) {
    console.error('Error in /api/farcaster/profile', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
