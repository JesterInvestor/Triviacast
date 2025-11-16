import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Simple JSON cache stored locally to reduce repeated Neynar bulk lookups.
// Structure: { byAddress: { [address]: { profile: {...}, fetchedAt: number } } }
const CACHE_PATH = path.join(process.cwd(), 'data', 'profile_cache.json');
const PROFILE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours TTL (adjust as needed)

async function readCache(): Promise<{ byAddress: Record<string, { profile: any; fetchedAt: number }> }> {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { byAddress: {} };
  }
}

async function writeCache(cache: { byAddress: Record<string, { profile: any; fetchedAt: number }> }) {
  try {
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch {}
}

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
    const force = body.force === true; // allow client to bypass cache
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

    const cache = await readCache();
    const now = Date.now();
    const addressToProfile: Record<string, any> = {};
    const errors: Record<string, string> = {};

    // Determine which addresses need fresh fetch
    const toFetch: string[] = [];
    for (const addr of normalizedAddresses) {
      const cached = cache.byAddress[addr];
      if (!cached) {
        toFetch.push(addr);
      } else if (force || now - cached.fetchedAt > PROFILE_TTL_MS) {
        toFetch.push(addr); // stale
      } else {
        addressToProfile[addr] = cached.profile; // serve from cache
      }
    }

    if (toFetch.length > 0) {
      let res: Record<string, any> = {};
      try {
        res = await client.fetchBulkUsersByEthOrSolAddress({ addresses: toFetch });
      } catch (err) {
        for (const addr of toFetch) {
          errors[addr] = 'Neynar API error: ' + String(err);
        }
      }
      for (const addr of toFetch) {
        const key = addr.toLowerCase();
        const users = res[key];
        if (Array.isArray(users) && users.length > 0) {
          const user = users[0];
          const profile = {
            fid: user.fid,
            username: user.username,
            displayName: user.display_name,
            avatarImgUrl: user.pfp_url,
            bio: user.profile?.bio?.text ?? '',
            followers: user.follower_count ?? 0,
            following: user.following_count ?? 0,
            hasPowerBadge: user.power_badge ?? false,
            custody_address: user.custody_address,
            verified_addresses: user.verified_addresses,
          };
          addressToProfile[key] = profile;
          cache.byAddress[key] = { profile, fetchedAt: now };
        } else if (!errors[key]) {
          errors[key] = 'Profile not found';
        }
      }
      // Persist updated cache
      await writeCache(cache);
    }

    return NextResponse.json({ result: addressToProfile, errors });
  } catch (e) {
    return NextResponse.json({ error: 'unexpected error', details: String(e) }, { status: 500 });
  }
}