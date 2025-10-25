import { NextResponse } from 'next/server';
import { resolveFarcasterProfile } from '@/lib/addressResolver';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const address = typeof body?.address === 'string' ? body.address.trim() : null;
    const username = typeof body?.username === 'string' ? body.username.trim().replace(/^@/, '') : null;

    let profile = null;
    if (username) {
      // Lookup by Farcaster username using Neynar API
      const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
      const resp = await fetch(
        `https://api.neynar.com/v2/farcaster/user-by-username?username=${username}`,
        {
          headers: {
            accept: 'application/json',
            ...(apiKey ? { 'X-API-KEY': apiKey, api_key: apiKey } : {}),
          },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.result) {
          const user = data.result;
          profile = {
            username: user.username,
            pfpUrl: user.pfp_url || user.avatar_url,
            bio: user.bio?.text,
            displayName: user.display_name,
            followers: user.follower_count,
            following: user.following_count,
            hasPowerBadge: !!user.power_badge,
            isFollowing: !!user.is_following,
            isOwnProfile: !!user.is_own_profile,
          };
        }
      }
    } else if (address) {
      profile = await resolveFarcasterProfile(address);
    }

    if (!profile) return NextResponse.json({ found: false, profile: null }, { status: 200 });
    return NextResponse.json({ found: true, profile }, { status: 200 });
  } catch (e) {
    console.error('Error in /api/farcaster/profile', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
