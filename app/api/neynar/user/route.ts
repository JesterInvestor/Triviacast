import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const addressParam = url.searchParams.get('address');
    if (!addressParam) return NextResponse.json({ error: 'missing address' }, { status: 400 });

    const address = decodeURIComponent(addressParam).trim();
    if (!address) return NextResponse.json({ error: 'missing address' }, { status: 400 });

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return new NextResponse(null, { status: 204 });

    const mod = await import('@neynar/nodejs-sdk');
    const { NeynarAPIClient, Configuration } = mod as any;
    const cfg = new Configuration({ apiKey });
    const client = new NeynarAPIClient(cfg);

    // fetchBulkUsersByEthOrSolAddress expects an object with addresses: string[]
    const res = await client.fetchBulkUsersByEthOrSolAddress({ addresses: [address] });

    // Try a couple fallbacks for where the SDK might put the user data
    // (res.result.user) OR (res.result) OR res directly.
    const rawUsers = res?.result?.user ?? res?.result ?? res ?? null;
    if (!rawUsers) return NextResponse.json({ result: null });

    // Normalize to a single user object (some endpoints return an array)
    const userObj = Array.isArray(rawUsers) ? rawUsers[0] ?? null : rawUsers;

    if (!userObj) return NextResponse.json({ result: null });

    // Return the full user object so the client can access custodyAddress, fid, pfp, etc.
    const resultPayload = { user: userObj };

    // Optional debug: ?debug=1 to inspect the raw SDK response
    if (url.searchParams.get('debug') === '1') {
      return NextResponse.json({ result: resultPayload, rawResponse: res });
    }

    return NextResponse.json({ result: resultPayload });
  } catch (e) {
    // If SDK is missing or call fails, return 204 to indicate no profile
    return new NextResponse(null, { status: 204 });
  }
}
