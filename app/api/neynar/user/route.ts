import { NextResponse } from 'next/server';
import { resolveAvatarUrl } from '@/lib/avatar';

function normalizeEthOrSolAddress(input: string): string | null {
  if (!input) return null;
  const s = decodeURIComponent(input).trim();
  const maybe = s.startsWith('0x') ? s : `0x${s}`;
  const lower = maybe.toLowerCase();
  if (/^0x[a-f0-9]{40}$/.test(lower)) return lower;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return s;
  return null;
}
export async function POST(request: Request) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'missing NEYNAR_API_KEY' }, { status: 500 });

    const mod = await import('@neynar/nodejs-sdk');
    const { NeynarAPIClient, Configuration } = mod as any;
    const client = new NeynarAPIClient(new Configuration({ apiKey }));

    const body = await request.json();
    const addresses = Array.isArray(body.addresses) ? body.addresses : [];
    if (addresses.length === 0) {
      return NextResponse.json({ error: 'Missing addresses array in request body.' }, { status: 400 });
    }

    // Normalize and lowercase all addresses
    const normalizedAddresses = addresses
      .map((addr: string) => {
        let a = normalizeEthOrSolAddress(addr);
        if (a && !a.startsWith('0x') && a.length === 40) a = '0x' + a;
        return a ? a.toLowerCase() : null;
      })
      .filter(Boolean) as string[];
    if (normalizedAddresses.length === 0) {
      return NextResponse.json({ error: 'No valid addresses after normalization.' }, { status: 400 });
    }

    const addressToProfile: Record<string, any> = {};
    const errors: Record<string, string> = {};

    // Try SDK first, then fall back to the documented HTTP GET endpoint if needed.
    let succeeded = false;
    try {
      if (client && typeof client.fetchBulkUsersByEthOrSolAddress === 'function') {
        const res = await client.fetchBulkUsersByEthOrSolAddress({ addresses: normalizedAddresses });
        for (const addr of normalizedAddresses) {
          const key = addr.toLowerCase();
          const users = res?.[key] || res?.[addr] || res?.[key.toUpperCase()];
          if (Array.isArray(users) && users.length > 0) {
            const user = users[0];
            const src = user.pfp_url || user.pfpUrl || user.avatar || user.profile?.pfpUrl || null;
            const profile = {
              fid: user.fid,
              username: user.username,
              displayName: user.display_name || user.displayName || user.name || undefined,
              avatarImgUrl: resolveAvatarUrl(src) || null,
              pfpUrl: resolveAvatarUrl(src) || null,
              avatar: resolveAvatarUrl(src) || null,
              bio: user.profile?.bio?.text ?? '',
              followers: user.follower_count ?? user.followers ?? 0,
              following: user.following_count ?? user.following ?? 0,
              hasPowerBadge: user.power_badge ?? false,
              custody_address: user.custody_address,
              verified_addresses: user.verified_addresses,
              raw: user,
            };
            addressToProfile[key] = profile;
          } else {
            errors[key] = 'Profile not found';
          }
        }
        succeeded = true;
      }
    } catch (err) {
      // fall through to HTTP fallback
      console.debug('Neynar SDK bulk fetch failed, will try HTTP fallback', String(err));
    }

    if (!succeeded) {
      try {
        const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address/?addresses=${encodeURIComponent(normalizedAddresses.join(','))}`;
        const resp = await fetch(url, { headers: { accept: 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}) } });
        if (resp.ok) {
          const data = await resp.json();
          // The API returns a mapping from address -> array of User
          for (const addr of normalizedAddresses) {
            const key = addr.toLowerCase();
            const users = data?.[key] || data?.[addr] || data?.[key.toUpperCase()] || [];
            if (Array.isArray(users) && users.length > 0) {
              const user = users[0];
              const src = user.pfp_url || user.pfpUrl || user.avatar || user.profile?.pfpUrl || null;
              const profile = {
                fid: user.fid,
                username: user.username,
                displayName: user.display_name || user.displayName || user.name || undefined,
                avatarImgUrl: resolveAvatarUrl(src) || null,
                pfpUrl: resolveAvatarUrl(src) || null,
                avatar: resolveAvatarUrl(src) || null,
                bio: user.profile?.bio?.text ?? '',
                followers: user.follower_count ?? user.followers ?? 0,
                following: user.following_count ?? user.following ?? 0,
                hasPowerBadge: user.power_badge ?? false,
                custody_address: user.custody_address,
                verified_addresses: user.verified_addresses,
                raw: user,
              };
              addressToProfile[key] = profile;
            } else {
              errors[key] = 'Profile not found';
            }
          }
          succeeded = true;
        } else {
          const text = await resp.text().catch(() => '');
          for (const addr of normalizedAddresses) {
            errors[addr] = `HTTP fallback failed: ${resp.status} ${text}`;
          }
        }
      } catch (err) {
        for (const addr of normalizedAddresses) {
          errors[addr] = 'Neynar HTTP fallback error: ' + String(err);
        }
      }
    }

    return NextResponse.json({ result: addressToProfile, errors });
  } catch (e) {
    return NextResponse.json({ error: 'unexpected error', details: String(e) }, { status: 500 });
  }
}