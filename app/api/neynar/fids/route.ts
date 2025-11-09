import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'missing NEYNAR_API_KEY' }, { status: 500 });

    const { NeynarAPIClient, Configuration } = (await import('@neynar/nodejs-sdk')) as any;
    const client = new NeynarAPIClient(new Configuration({ apiKey }));

    const body = await request.json();
    const fids = Array.isArray(body?.fids) ? body.fids : [];
    if (fids.length === 0) {
      return NextResponse.json({ error: 'Missing fids array in request body.' }, { status: 400 });
    }

    const result: Record<string, any> = {};
    const errors: Record<string, string> = {};

    // Try a bulk method if available; otherwise fall back to per-FID lookups
    try {
      if (typeof (client as any).fetchBulkUsersByFid === 'function') {
        const res = await (client as any).fetchBulkUsersByFid({ fids });
        // Expect res to be a mapping from fid (number|string) -> array/users
        for (const fid of fids) {
          const key = String(fid);
          const users = (res as any)[key];
          const user = Array.isArray(users) ? users[0] : users;
          if (user) {
            result[key] = {
              fid: user.fid,
              username: user.username,
              displayName: user.display_name ?? user.displayName,
              avatarImgUrl: user.pfp_url ?? user.avatar,
              bio: user.profile?.bio?.text ?? '',
              followers: user.follower_count ?? 0,
              following: user.following_count ?? 0,
              hasPowerBadge: user.power_badge ?? false,
            };
          } else {
            errors[key] = 'No user found for FID';
          }
        }
      } else {
        // Fallback: sequential lookup
        for (const fid of fids) {
          const key = String(fid);
          try {
            const user = await (client as any).lookupUserByFid(fid);
            if (user) {
              const u = (user as any).result?.user ?? user;
              result[key] = {
                fid: u.fid,
                username: u.username,
                displayName: u.display_name ?? u.displayName,
                avatarImgUrl: u.pfp_url ?? u.avatar,
                bio: u.profile?.bio?.text ?? '',
                followers: u.follower_count ?? 0,
                following: u.following_count ?? 0,
                hasPowerBadge: u.power_badge ?? false,
              };
            } else {
              errors[key] = 'No user found for FID';
            }
          } catch (e) {
            errors[key] = 'Neynar API error: ' + String(e);
          }
        }
      }
    } catch (e) {
      for (const fid of fids) {
        errors[String(fid)] = 'Neynar API error: ' + String(e);
      }
    }

    return NextResponse.json({ result, errors });
  } catch (e) {
    return NextResponse.json({ error: 'unexpected error', details: String(e) }, { status: 500 });
  }
}
