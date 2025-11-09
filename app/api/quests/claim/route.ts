import { NextRequest, NextResponse } from 'next/server'
import { parseAbi } from 'viem'
import { validateOrigin, parseQuestId, parseUserAddress, createRelayerWallet } from '@/lib/server/quests'

// Minimal server-side relayer to award iQ without a wallet transaction from the user.
// SECURITY: This endpoint should be protected before production use.
// For now, it requires BACKEND_PRIVATE_KEY and QUEST_MANAGER_ADDRESS to be set.

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { address, questId } = await req.json()
    const originErr = validateOrigin(req)
    if (originErr) return NextResponse.json({ error: originErr }, { status: 403 })

    // Simple in-memory rate limit per IP+day+quest
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const today = Math.floor(Date.now()/86400000)
    const key = `${ip}:${address}:${questId}:${today}`
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ;(globalThis as any).__questLimiter = (globalThis as any).__questLimiter || new Map<string, number>()
    const limiter: Map<string, number> = (globalThis as any).__questLimiter
    const now = Date.now()
    const last = limiter.get(key) || 0
    if (now - last < 5_000) { // 5s cooldown for same IP/address/quest
      return NextResponse.json({ error: 'rate limited' }, { status: 429 })
    }
    limiter.set(key, now)
    const user = parseUserAddress(address)
    if (!user) return NextResponse.json({ error: 'invalid address' }, { status: 400 })
    const idNum = parseQuestId(questId)
    if (!idNum) return NextResponse.json({ error: 'invalid quest id' }, { status: 400 })

    const relayer = createRelayerWallet()
    if ('error' in relayer) return NextResponse.json({ error: 'gasless not configured' }, { status: 501 })
    const { wallet, account, questManager } = relayer

    const abi = parseAbi([
      'function claimFor(address user, uint8 id) external',
    ])

    const hash = await wallet.writeContract({
      account,
      address: questManager,
      abi,
      functionName: 'claimFor',
      args: [user, idNum],
    })

    return NextResponse.json({ hash })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
