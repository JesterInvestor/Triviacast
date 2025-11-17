import { NextResponse } from 'next/server';
import { resolveAvatarUrl } from '@/lib/avatar';

// POST /api/neynar/fetch-by-username
// Body: { username: string, limit?: number }
// Returns: { result: Array<NormalizedProfile> }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const usernameRaw = String(body?.username || '').replace(/^@/, '').trim();
    const limit = Number(body?.limit || 20);
    if (!usernameRaw) return NextResponse.json({ error: 'username required' }, { status: 400 });

    const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

    // First: fetch user by username to get fid
    try {
      const userUrl = `https://api.neynar.com/v2/farcaster/user/by-username/?username=${encodeURIComponent(usernameRaw)}`;
      const userResp = await fetch(userUrl, { headers: { accept: 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}) } });
      if (!userResp.ok) return NextResponse.json({ error: 'user lookup failed' }, { status: 502 });
      const userData = await userResp.json().catch(() => (null as any));
      const user = userData?.result || userData || null;
      const fid = user?.fid || user?.profile?.fid || null;
      if (!fid) return NextResponse.json({ error: 'fid not found for username' }, { status: 404 });

      // Next: fetch following (people the user follows) as friend suggestions
      const followUrl = `https://api.neynar.com/v2/farcaster/following/?fid=${encodeURIComponent(String(fid))}&limit=${limit}`;
      const followResp = await fetch(followUrl, { headers: { accept: 'application/json', ...(apiKey ? { 'X-API-KEY': apiKey } : {}) } });
      if (!followResp.ok) return NextResponse.json({ result: [] });
      const followData = await followResp.json().catch(() => ({} as any));
      const arr = followData?.result || followData?.users || followData || [];
      if (!Array.isArray(arr)) return NextResponse.json({ result: [] });

      const normalized = arr.map((u: any) => {
        const src = u.pfp_url || u.pfpUrl || u.avatar || (u.raw && (u.raw.pfpUrl || u.raw.pfp_url)) || undefined;
        return {
          fid: u.fid,
          username: u.username ? `@${String(u.username).replace(/^@/, '').replace(/(?:\.farcaster\.eth|\.eth)$/i, '')}` : undefined,
          displayName: u.display_name || u.displayName || u.name || undefined,
          pfpUrl: resolveAvatarUrl(src) || undefined,
          followers: u.follower_count ?? u.followers ?? 0,
          raw: u,
        };
      });

      return NextResponse.json({ result: normalized });
    } catch (err) {
      return NextResponse.json({ error: 'neynar fetch error', details: String(err) }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'internal', details: String(err) }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
