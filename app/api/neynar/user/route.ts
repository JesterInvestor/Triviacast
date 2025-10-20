import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'missing address' }, { status: 400 });

    // Try to load the Neynar SDK dynamically. If it's not installed or NEYNAR_API_KEY is missing,
    // return 204 so the client can treat it as "no profile available".
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return NextResponse.json({ result: null }, { status: 204 });

    const mod = await import('@neynar/nodejs-sdk');
    const { NeynarAPIClient, Configuration } = mod as any;
    const cfg = new Configuration({ apiKey });
    const client = new NeynarAPIClient(cfg);

    // fetchBulkUsersByEthOrSolAddress expects an object with addresses: string[]
    const res = await client.fetchBulkUsersByEthOrSolAddress({ addresses: [address] });
    // Normalize response
    const user = res?.result?.user ?? null;
    return NextResponse.json({ result: user ?? null });
  } catch (e) {
    // If SDK is missing or call fails, return 204 to indicate no profile
    return NextResponse.json({ result: null }, { status: 204 });
  }
}
