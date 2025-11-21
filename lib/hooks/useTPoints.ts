import { useEffect, useState } from 'react'
import { readContract } from '@wagmi/core'
import { base } from 'wagmi/chains'
import { wagmiConfig } from '@/lib/wagmi'

// Minimal ABI fragments for candidate function names (only the signature matters)
const ABI_CANDIDATES = {
  getPoints: [{ name: 'getPoints', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }],
  pointsOf: [{ name: 'pointsOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }],
  getBalance: [{ name: 'getBalance', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }],
  balanceOf: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }],
  points: [{ name: 'points', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }],
} as const

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

      // Candidate function names to try (in order)
      const candidates = ['getPoints', 'pointsOf', 'getBalance', 'balanceOf', 'points'] as const

      // Try each candidate sequentially. Log failures to console for debugging.
      for (const name of candidates) {
        const abi = (ABI_CANDIDATES as any)[name]
        try {
          const res = await (readContract as any)(
            {
              address: TPOINTS_ADDRESS,
              abi: abi as any,
              functionName: name,
              args: [address],
              chainId: base.id,
            },
            wagmiConfig
          )
          // If result is undefined/null, continue trying; otherwise set value
          if (res === undefined || res === null) {
            console.debug(`[useTPoints] ${name} returned null/undefined for ${address} on ${TPOINTS_ADDRESS}`)
            continue
          }
          // coerce to bigint
          const value = BigInt(res ?? 0)
          if (!cancelled) {
            console.debug(`[useTPoints] succeeded with ${name}:`, String(value))
            setTPoints(value)
          }
          return
        } catch (err: any) {
          // Log detailed error to help debug: RPC error, revert, method not found, rate limit, etc.
          try {
            console.error('[useTPoints] readContract failed', {
              attemptedFunction: name,
              contract: TPOINTS_ADDRESS,
              callerAddress: address,
              message: err?.message,
              code: err?.code ?? err?.data?.code,
              responseData: err?.data ?? err?.response?.data ?? null,
              responseHeaders: err?.response?.headers ?? err?.data?.headers ?? null,
              raw: err,
            })
          } catch (loggingErr) {
            console.error('[useTPoints] failed to log error details', loggingErr)
          }
          // If this was a rate-limit error (-32016 or HTTP 429), we may bail and leave null to avoid hammering.
          // Continue to next candidate otherwise.
          continue
        }
      }

      // If none of the candidates succeeded, set null and log.
      if (!cancelled) {
        console.warn('[useTPoints] no candidate getter succeeded; tPoints set to null. Check contract address/ABI/function name/chain.')
        setTPoints(null)
      }
    }
    load()
    return () => { cancelled = true }
  }, [address, TPOINTS_ADDRESS])

  return { tPoints }
}
