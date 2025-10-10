import { NextResponse } from 'next/server';
import { getPointsFromChain, isContractConfigured } from '@/lib/contract';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = (searchParams.get('address') || '').trim();
  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 });
  }
  try {
    const configured = isContractConfigured();
    if (!configured) {
      return NextResponse.json({ configured, address, points: 0 });
    }
    const points = await getPointsFromChain(address);
    return NextResponse.json({ configured, address, points });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'unknown-error' }, { status: 500 });
  }
}
