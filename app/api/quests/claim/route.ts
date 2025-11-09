import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// Minimal server-side relayer to award iQ without a wallet transaction from the user.
// SECURITY: This endpoint should be protected before production use.
// For now, it requires BACKEND_PRIVATE_KEY and QUEST_MANAGER_ADDRESS to be set.

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { address, questId } = await req.json()
    // Basic origin check (CSRF protection)
    const allowedOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN
    const origin = req.headers.get('origin') || ''
    if (allowedOrigin && origin && origin !== allowedOrigin) {
      return NextResponse.json({ error: 'invalid origin' }, { status: 403 })
    }

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
    if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
      return NextResponse.json({ error: 'invalid address' }, { status: 400 })
    }
    const idNum = Number(questId)
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json({ error: 'invalid quest id' }, { status: 400 })
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
    if (!pk || !questManager) {
      return NextResponse.json({ error: 'gasless not configured' }, { status: 501 })
    }

    // Create a wallet client with the relayer key
    const client = createWalletClient({ chain: base, transport: http(rpc) })
      .extend((c) => ({ account: (c as any).account })) as any

    // viem requires the private key to be set as account; use built-in support via environment in production
    // Here we reconstruct a client with the PK; in many setups you would use viem/accounts fromPrivateKey
  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, '')}` as `0x${string}`)
  const wallet = createWalletClient({ account, chain: base, transport: http(rpc) })

    const abi = parseAbi([
      'function claimFor(address user, uint8 id) external',
    ])

    const hash = await wallet.writeContract({
      account,
      address: questManager,
      abi,
      functionName: 'claimFor',
      args: [address as `0x${string}`, idNum],
    })

    return NextResponse.json({ hash })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
