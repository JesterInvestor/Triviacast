import { useEffect, useState } from 'react'
import { getIQPoints } from '@/lib/iq'

export function useIQPoints(address?: `0x${string}`) {
  const [points, setPoints] = useState<bigint | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!address) { setPoints(null); return }
      try {
        const v = await getIQPoints(address)
        if (!cancelled) { setPoints(v); setError(null) }
      } catch (e:any) { if (!cancelled) { setPoints(null); setError(e.message || 'iq fetch failed') } }
    }
    load()
    return () => { cancelled = true }
  }, [address])

  // Auto-refresh on global iqUpdated event
  useEffect(() => {
    const handler = () => {
      if (!address) return
      getIQPoints(address).then(v => setPoints(v)).catch(() => {})
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('triviacast:iqUpdated', handler)
      return () => window.removeEventListener('triviacast:iqUpdated', handler)
    }
  }, [address])

  return { iqPoints: points, iqError: error }
}
