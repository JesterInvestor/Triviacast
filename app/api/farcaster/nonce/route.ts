import { NextResponse } from "next/server";

// Very small dev-friendly nonce endpoint. Production: replace with real on-chain calls.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const contract = url.searchParams.get('contract') || '';
    const address = url.searchParams.get('address') || '';

    if (!contract || !address) return NextResponse.json({ error: 'contract and address query params required' }, { status: 400 });

    // If you wire a provider / RPC you can implement real nonce queries here.
    // For local/dev convenience return 0 unless a provider is configured.
    if (!process.env.FARCASTER_RPC_URL) {
      return NextResponse.json({ nonce: 0, dev: true, note: 'FARCASTER_RPC_URL not configured; returning 0' });
    }

    // TODO: implement real RPC lookups (viem/ethers) when FARCASTER_RPC_URL is provided.
    return NextResponse.json({ nonce: 0, note: 'RPC configured but lookups not implemented in this example' });
  } catch (err: unknown) {
    console.error('nonce endpoint error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
