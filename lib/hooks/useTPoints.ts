import { useEffect, useState } from 'react'
import { readContract } from '@wagmi/core'
import { base } from 'wagmi/chains'
import { wagmiConfig } from '@/lib/wagmi'

// Minimal ABI: assumes T-points contract exposes getPoints(address) -> uint256
const TPOINTS_ABI = [
  { name: 'getPoints', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const

// Prefer the new variable NEXT_PUBLIC_TRIVIA_POINTS_ADDRESS, fall back to legacy NEXT_PUBLIC_TPOINTS_ADDRESS
const TPOINTS_ADDRESS = (process.env.NEXT_PUBLIC_TRIVIA_POINTS_ADDRESS ||
                         process.env.NEXT_PUBLIC_TPOINTS_ADDRESS) as `0x${string}` | undefined

// Hook: returns bigint or null while loading/not available
export default function useTPoints(address?: `0x${string}`) {
  const [tPoints, setTPoints] = useState<bigint | null>(null)
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!address || !TPOINTS_ADDRESS) {
        if (!cancelled) setTPoints(null)
        return
      }
      try {
        // Cast readContract to any to avoid mismatched Config typing across @wagmi/core versions.
        const res = await (readContract as any)(
          {
            address: TPOINTS_ADDRESS,
            abi: TPOINTS_ABI as any,
            functionName: 'getPoints',
            args: [address],
            chainId: base.id,
          },
          wagmiConfig
        )
        if (!cancelled) setTPoints(BigInt(res ?? 0))
      } catch (e) {
        if (!cancelled) setTPoints(null)
      }
    }
    load()
    return () => { cancelled = true }
  }, [address, TPOINTS_ADDRESS])

  return { tPoints }
}
