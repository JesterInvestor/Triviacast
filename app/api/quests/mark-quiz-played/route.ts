import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()
    const allowedOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN
    const origin = req.headers.get('origin') || ''
    if (allowedOrigin && origin && origin !== allowedOrigin) {
      return NextResponse.json({ error: 'invalid origin' }, { status: 403 })
    }
    if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
      return NextResponse.json({ error: 'invalid address' }, { status: 400 })
    }
    const pk = process.env.BACKEND_PRIVATE_KEY
    const questManager = process.env.NEXT_PUBLIC_QUEST_MANAGER_ADDRESS as `0x${string}` | undefined
    const rpc =
      process.env.BASE_RPC_URL
      || process.env.BASE_MAINNET_RPC_URL
      || process.env.NEXT_PUBLIC_RPC_URL
      || (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` : undefined)
      || (process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}` : undefined)
      || 'https://mainnet.base.org'
    if (!pk || !questManager) return NextResponse.json({ error: 'not configured' }, { status: 501 })

    const account = privateKeyToAccount(`0x${pk.replace(/^0x/, '')}` as `0x${string}`)
    const wallet = createWalletClient({ account, chain: base, transport: http(rpc) })
    const abi = parseAbi(['function markQuizPlayedForToday(address user) external'])
    const hash = await wallet.writeContract({ account, address: questManager, abi, functionName: 'markQuizPlayedForToday', args: [address as `0x${string}`] })
    return NextResponse.json({ hash })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
