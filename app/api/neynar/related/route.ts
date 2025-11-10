import { NextResponse } from 'next/server';

// POST /api/neynar/related
// Body: { fid: number, limit?: number }
// Returns an array of lightweight profiles suggested as related to the fid
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fid = Number(body?.fid || 0);
    const limit = Number(body?.limit || 6);
    const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
    if (!fid || fid <= 0) return NextResponse.json({ error: 'fid required' }, { status: 400 });

    // Try SDK first
    try {
      const mod: any = await import('@neynar/nodejs-sdk');
      const { NeynarAPIClient, Configuration } = mod;
      const client = new NeynarAPIClient(new Configuration({ apiKey }));
      if (typeof client.fetchFollowSuggestions === 'function') {
        const sdkResp: any = await client.fetchFollowSuggestions({ fid, limit });
        const arr = sdkResp?.result || sdkResp?.users || sdkResp || [];
        if (Array.isArray(arr)) {
          const normalized = arr.map((u: any) => ({
            fid: u.fid,
            username: u.username ? `@${String(u.username).replace(/^@/, '')}` : undefined,
            displayName: u.display_name || u.displayName || u.name || undefined,
            pfpUrl: u.pfp_url || u.pfpUrl || u.avatar || undefined,
            followers: u.follower_count ?? u.followers ?? 0,
            raw: u,
          }));
          return NextResponse.json({ result: normalized });
        }
      }
    } catch (e) {
      // ignore SDK errors and fall through to HTTP fallback
    }

    // HTTP fallback
    try {
      const url = `https://api.neynar.com/v2/farcaster/following/suggested/?fid=${encodeURIComponent(String(fid))}&limit=${limit}`;
      const resp = await fetch(url, { headers: { accept: 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}) } });
      if (!resp.ok) return NextResponse.json({ result: [] });
      const data = await resp.json();
      const arr = data?.result || data?.users || data || [];
      if (Array.isArray(arr)) {
        const normalized = arr.map((u: any) => ({
          fid: u.fid,
          username: u.username ? `@${String(u.username).replace(/^@/, '')}` : undefined,
          displayName: u.display_name || u.displayName || u.name || undefined,
          pfpUrl: u.pfp_url || u.pfpUrl || u.avatar || undefined,
          followers: u.follower_count ?? u.followers ?? 0,
          raw: u,
        }));
        return NextResponse.json({ result: normalized });
      }
    } catch (e) {
      // fallback empty
    }

    return NextResponse.json({ result: [] });
  } catch (e) {
    return NextResponse.json({ error: 'internal', details: String(e) }, { status: 500 });
  }
}
