
import { NextResponse } from 'next/server';

function normalizeEthOrSolAddress(input: string): string | null {
  if (!input) return null;
  const s = decodeURIComponent(input).trim();
  const maybe = s.startsWith('0x') ? s : `0x${s}`;
  const lower = maybe.toLowerCase();
  if (/^0x[a-f0-9]{40}$/.test(lower)) return lower;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return s;
  return null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const addressParam = url.searchParams.get('address');
    if (!addressParam) {
      return NextResponse.json({ error: 'Missing address parameter in request.' }, { status: 400 });
    }

    const formattedAddress = normalizeEthOrSolAddress(addressParam);
    if (!formattedAddress) {
      return NextResponse.json({ error: `Invalid address format: ${addressParam}` }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'missing NEYNAR_API_KEY' }, { status: 500 });

    const mod = await import('@neynar/nodejs-sdk');
    const { NeynarAPIClient, Configuration } = mod as any;
    const cfg = new Configuration({ apiKey });
    const client = new NeynarAPIClient(cfg);

    const res = await client.fetchBulkUsersByEthOrSolAddress({ addresses: [formattedAddress] });

    const rawUsers = res?.result?.user ?? res?.result ?? res ?? null;
    if (!rawUsers) return NextResponse.json({ result: null });
    const userObj = Array.isArray(rawUsers) ? rawUsers[0] ?? null : rawUsers;
    if (!userObj) return NextResponse.json({ result: null });

    // Flatten: return the user object as result so clients can read json.result.custodyAddress, etc.
    if (url.searchParams.get('debug') === '1') {
      return NextResponse.json({ result: userObj, rawResponse: res });
    }
    return NextResponse.json({ result: userObj });
  } catch (e) {
    return NextResponse.json({ error: 'unexpected error', details: String(e) }, { status: 500 });
  }

}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'missing NEYNAR_API_KEY' }, { status: 500 });

    const mod = await import('@neynar/nodejs-sdk');
    const { NeynarAPIClient, Configuration } = mod as any;
    const cfg = new Configuration({ apiKey });
    const client = new NeynarAPIClient(cfg);

    const body = await request.json();
    let addresses = body.addresses;
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: 'Missing addresses array in request body.' }, { status: 400 });
    }

    // Normalize addresses
    addresses = addresses
      .map((addr: string) => normalizeEthOrSolAddress(addr))
      .filter(Boolean);
    if (addresses.length === 0) {
      return NextResponse.json({ error: 'No valid addresses after normalization.' }, { status: 400 });
    }

    // Debug: log incoming addresses
    console.log('[Neynar API] Incoming addresses:', addresses);

    let addressToProfile: Record<string, any> = {};
    let errors: Record<string, string> = {};
    try {
      // Fetch full user profiles by wallet address
      const res = await client.fetchBulkUsersByEthOrSolAddress({ addresses });
      console.log('[Neynar API] Raw response:', JSON.stringify(res, null, 2));
      const rawUsers = res?.result?.user ?? res?.result ?? res ?? null;
      if (!rawUsers) {
        errors['all'] = 'No users found for provided addresses.';
      } else {
        const userArr = Array.isArray(rawUsers) ? rawUsers : [rawUsers];
        for (const user of userArr) {
          const key = user.custody_address?.toLowerCase() || '';
          if (!key) {
            errors['unknown'] = 'Missing custody_address for user.';
            continue;
          }
          addressToProfile[key] = {
            fid: user.fid,
            username: user.username,
            displayName: user.display_name,
            avatarImgUrl: user.pfp_url,
            bio: user.profile?.bio?.text ?? '',
            followers: user.follower_count ?? 0,
            following: user.following_count ?? 0,
            hasPowerBadge: user.power_badge ?? false,
          };
        }
      }
    } catch (err) {
      console.error('[Neynar API] Error fetching profiles:', err);
      errors['api'] = String(err);
    }

    // Always return partial results and errors
    return NextResponse.json({ result: addressToProfile, errors });
  } catch (e) {
    console.error('[Neynar API] Unexpected error:', e);
    return NextResponse.json({ error: 'unexpected error', details: String(e) }, { status: 500 });
  }
}
