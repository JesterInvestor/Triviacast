import { NextResponse } from 'next/server';

export async function GET() {
  // Expose only public NEXT_PUBLIC_ env vars needed by the client at runtime.
  // If the public NEXT_PUBLIC_STAKING_ADDRESS is not set, fall back to a server-side
  // `STAKING_ADDRESS` env var so deployed servers can expose the value at runtime
  // without requiring a rebuild. This helps embedded hosts (Farcaster) and CI.
  const payload = {
    NEXT_PUBLIC_STAKING_ADDRESS:
      process.env.NEXT_PUBLIC_STAKING_ADDRESS ?? process.env.STAKING_ADDRESS ?? null,
    NEXT_PUBLIC_TRIV_ADDRESS: process.env.NEXT_PUBLIC_TRIV_ADDRESS ?? null,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID ?? null,
  };

  return NextResponse.json(payload, { status: 200 });
}
