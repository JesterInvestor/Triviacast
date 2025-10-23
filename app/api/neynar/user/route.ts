import { NextResponse } from 'next/server';

function normalizeEthOrSolAddress(input: string): string | null {
  if (!input) return null;
  const s = decodeURIComponent(input).trim();
  // If user provided a bare hex without 0x, add prefix
  const maybe = s.startsWith('0x') ? s : `0x${s}`;
  // Normalize to lowercase for lookup keys / API calls (Neynar should accept either)
  const lower = maybe.toLowerCase();
  // Basic validation: 0x + 40 hex chars
  if (/^0x[a-f0-9]{40}$/.test(lower)) return lower;
  // Could be a Solana address (base58) — accept if it looks like base58 (simple length check)
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

    // Format/normalize address before calling Neynar
    const formattedAddress = normalizeEthOrSolAddress(addressParam);
    if (!formattedAddress) {
      return NextResponse.json({ error: 'invalid address format' }, { status: 400 });
    }

    // If no API key configured, return 204 so client treats it as "no profile"
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return new NextResponse(null, { status: 204 });

    const mod = await import('@neynar/nodejs-sdk');
    const { NeynarAPIClient, Configuration } = mod as any;
    const cfg = new Configuration({ apiKey });
    const client = new NeynarAPIClient(cfg);

    // Call Neynar with the formatted address
    const res = await client.fetchBulkUsersByEthOrSolAddress({ addresses: [formattedAddress] });

    // The SDK may return the user(s) in different shapes; try the common places
    const rawUsers = res?.result?.user ?? res?.result ?? res ?? null;
    if (!rawUsers) return NextResponse.json({ result: null });

    const userObj = Array.isArray(rawUsers) ? rawUsers[0] ?? null : rawUsers;
    if (!userObj) return NextResponse.json({ result: null });

    // Return the full user object so the client can access custodyAddress, fid, pfp, etc.
    // Also include the formattedAddress we queried so the client can correlate results to the original request.
    const payload = {
      user: userObj,
      queriedAddress: formattedAddress,
    };

    // Optional debug: ?debug=1 to see the raw SDK response alongside the normalized payload
    if (url.searchParams.get('debug') === '1') {
      return NextResponse.json({ result: payload, rawResponse: res });
    }

    return NextResponse.json({ result: payload });
  } catch (e) {
    // On error (SDK missing, call failure), return 204 so client treats as "no profile"
    return new NextResponse(null, { status: 204 });
  }
}
