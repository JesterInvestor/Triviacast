import { useEffect, useState } from 'react'
import { readContract } from '@wagmi/core'
import { base } from 'wagmi/chains'

// Minimal ABI: assumes T-points contract exposes getPoints(address) -> uint256
const TPOINTS_ABI = [
  { name: 'getPoints', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const

const TPOINTS_ADDRESS = process.env.NEXT_PUBLIC_TPOINTS_ADDRESS as `0x${string}` | undefined

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
        const res = await readContract({
          address: TPOINTS_ADDRESS,
          abi: TPOINTS_ABI as any,
          functionName: 'getPoints',
          args: [address],
          chainId: base.id,
        })
        if (!cancelled) setTPoints(BigInt(res ?? 0))
      } catch (e) {
        // on error, leave as null (caller can treat as 0)
        if (!cancelled) setTPoints(null)
      }
    }
    load()
    return () => { cancelled = true }
  }, [address])

  return { tPoints }
}
