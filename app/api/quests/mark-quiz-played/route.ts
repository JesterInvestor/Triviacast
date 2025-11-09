import { NextRequest, NextResponse } from 'next/server'
import { parseAbi } from 'viem'
import { validateOrigin, createRelayerWallet, parseUserAddress } from '@/lib/server/quests'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Disabled: relayer not used. Frontend does not call this.
  return NextResponse.json({ error: 'mark quiz relayer disabled' }, { status: 501 })
}
