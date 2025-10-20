import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'missing address' }, { status: 400 });

    // Try to load the Neynar SDK dynamically. If it's not installed or NEYNAR_API_KEY is missing,
    // return 204 so the client can treat it as "no profile available".
    const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return new NextResponse(null, { status: 204 });

    const mod = await import('@neynar/nodejs-sdk');
    const { NeynarAPIClient, Configuration } = mod as any;
    const cfg = new Configuration({ apiKey });
    const client = new NeynarAPIClient(cfg);

  // fetchBulkUsersByEthOrSolAddress expects an object with addresses: string[]
  const res = await client.fetchBulkUsersByEthOrSolAddress({ addresses: [address] });
  // Normalize response and return only username/displayName to avoid fetching avatars on the client
  const raw = res?.result?.user ?? null;
  if (!raw) return NextResponse.json({ result: null });
  // raw may be an array or object; try to normalize to a single user
  const userObj = Array.isArray(raw) ? raw[0] ?? null : raw;
  const username = userObj?.username ?? userObj?.result?.username ?? null;
  const displayName = userObj?.displayName ?? userObj?.result?.displayName ?? null;
  return NextResponse.json({ result: { username: username ?? null, displayName: displayName ?? null } });
  } catch (e) {
    // If SDK is missing or call fails, return an empty 204 to indicate no profile
    return new NextResponse(null, { status: 204 });
  }
}
