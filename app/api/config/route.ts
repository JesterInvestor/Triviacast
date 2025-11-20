import { NextResponse } from 'next/server';

export async function GET() {
  // Expose only public NEXT_PUBLIC_ env vars needed by the client at runtime.
  const payload = {
    NEXT_PUBLIC_STAKING_ADDRESS: process.env.NEXT_PUBLIC_STAKING_ADDRESS ?? null,
    NEXT_PUBLIC_TRIV_ADDRESS: process.env.NEXT_PUBLIC_TRIV_ADDRESS ?? null,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID ?? null,
  };

  return NextResponse.json(payload, { status: 200 });
}
