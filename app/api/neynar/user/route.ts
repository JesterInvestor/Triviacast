
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
      return NextResponse.json({ error: 'missing address' }, { status: 400 });
    }

    const formattedAddress = normalizeEthOrSolAddress(addressParam);
    if (!formattedAddress) {
      return NextResponse.json({ error: 'invalid address format' }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return new NextResponse(null, { status: 204 });

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
    return new NextResponse(null, { status: 204 });
  }

}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return new NextResponse(null, { status: 204 });

    const mod = await import('@neynar/nodejs-sdk');
    const { NeynarAPIClient, Configuration } = mod as any;
    const cfg = new Configuration({ apiKey });
    const client = new NeynarAPIClient(cfg);

    const body = await request.json();
    let addresses = body.addresses;
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: 'missing addresses array' }, { status: 400 });
    }

    // Normalize addresses
    addresses = addresses
      .map((addr: string) => normalizeEthOrSolAddress(addr))
      .filter(Boolean);
    if (addresses.length === 0) {
      return NextResponse.json({ error: 'no valid addresses' }, { status: 400 });
    }

    // Step 1: Get FIDs for addresses
    const res = await client.fetchBulkUsersByEthOrSolAddress({ addresses });
    const rawUsers = res?.result?.user ?? res?.result ?? res ?? null;
    if (!rawUsers) return NextResponse.json({ result: null });
    const userArr = Array.isArray(rawUsers) ? rawUsers : [rawUsers];

    // Step 2: Get FIDs
    const fids = userArr.map((u: any) => u.fid).filter(Boolean);
    if (fids.length === 0) {
      return NextResponse.json({ result: [] });
    }

    // Step 3: Fetch profile info for each FID
    const profileRes = await client.fetchBulkUsersByFids({ fids });
    const profiles = profileRes?.result?.users ?? [];

    // Step 4: Map address to profile info
    const addressToProfile: Record<string, any> = {};
    for (const user of userArr) {
      const fid = user.fid;
      const profile = profiles.find((p: any) => p.fid === fid);
      if (profile) {
        addressToProfile[user.custody_address?.toLowerCase() || ''] = {
          fid: profile.fid,
          username: profile.username,
          displayName: profile.display_name,
          avatarImgUrl: profile.pfp_url,
          bio: profile.profile?.bio?.text ?? '',
          followers: profile.follower_count ?? 0,
          following: profile.following_count ?? 0,
          hasPowerBadge: profile.power_badge ?? false,
        };
      }
    }

    return NextResponse.json({ result: addressToProfile });
  } catch (e) {
    return new NextResponse(null, { status: 204 });
  }
}
