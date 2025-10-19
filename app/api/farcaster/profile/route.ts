import { NextResponse } from 'next/server';
import { resolveFarcasterProfile } from '@/lib/addressResolver';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const address = typeof body?.address === 'string' ? body.address.trim() : null;
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

    const profile = await resolveFarcasterProfile(address);
    if (!profile) return NextResponse.json({ found: false, profile: null }, { status: 200 });

    return NextResponse.json({ found: true, profile }, { status: 200 });
  } catch (e) {
    console.error('Error in /api/farcaster/profile', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
