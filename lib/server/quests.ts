import { NextRequest } from 'next/server'
import { createWalletClient, http } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

export function validateOrigin(req: NextRequest): string | null {
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN
  const origin = req.headers.get('origin') || ''
  if (allowedOrigin && origin && origin !== allowedOrigin) {
    return 'invalid origin'
  }
  return null
}

export function pickBaseRpcUrl(): string {
  return (
    process.env.BASE_RPC_URL ||
    process.env.BASE_MAINNET_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` : undefined) ||
    (process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}` : undefined) ||
    'https://mainnet.base.org'
  )
}

export function parseUserAddress(address: unknown): `0x${string}` | null {
  if (typeof address === 'string' && address.startsWith('0x')) return address as `0x${string}`
  return null
}

export function parseQuestId(id: unknown): number | null {
  const n = Number(id)
  if (Number.isInteger(n) && n > 0) return n
  return null
}

export function getRelayerEnv() {
  const pk = process.env.BACKEND_PRIVATE_KEY
  const questManager = process.env.NEXT_PUBLIC_QUEST_MANAGER_ADDRESS as `0x${string}` | undefined
  const rpc = pickBaseRpcUrl()
  return { pk, questManager, rpc }
}

export function createRelayerWallet() {
  const { pk, questManager, rpc } = getRelayerEnv()
  if (!pk || !questManager) return { error: 'not configured' as const }
  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, '')}` as `0x${string}`)
  const wallet = createWalletClient({ account, chain: base, transport: http(rpc) })
  return { wallet, account, questManager }
}
