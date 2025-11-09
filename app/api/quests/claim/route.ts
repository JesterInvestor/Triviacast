import { NextRequest, NextResponse } from 'next/server'
import { parseAbi } from 'viem'
import { validateOrigin, parseQuestId, parseUserAddress, createRelayerWallet } from '@/lib/server/quests'

// Minimal server-side relayer to award iQ without a wallet transaction from the user.
// SECURITY: This endpoint should be protected before production use.
// For now, it requires BACKEND_PRIVATE_KEY and QUEST_MANAGER_ADDRESS to be set.

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Disabled: gasless/private-key relayer is not used.
  return NextResponse.json({ error: 'quest claim relayer disabled' }, { status: 501 })
}
// Previous implementation (relayer) removed for safety.
