import { NextRequest, NextResponse } from 'next/server'
import { parseAbi } from 'viem'
import { validateOrigin, createRelayerWallet, parseUserAddress } from '@/lib/server/quests'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()
    const originErr = validateOrigin(req)
    if (originErr) return NextResponse.json({ error: originErr }, { status: 403 })
    const user = parseUserAddress(address)
    if (!user) return NextResponse.json({ error: 'invalid address' }, { status: 400 })
    const relayer = createRelayerWallet()
    if ('error' in relayer) return NextResponse.json({ error: 'not configured' }, { status: 501 })
    const { wallet, account, questManager } = relayer
    const abi = parseAbi(['function markQuizPlayedForToday(address user) external'])
    const hash = await wallet.writeContract({ account, address: questManager, abi, functionName: 'markQuizPlayedForToday', args: [user] })
    return NextResponse.json({ hash })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
