import { useCallback, useEffect, useMemo, useState } from 'react'
import { getLastClaimDay, claimShare, claimDailyQuizPlay, claimDailyChallenge } from '@/lib/iq'

export function useQuestIQ(address?: `0x${string}`) {
  const [lastDays, setLastDays] = useState<Record<number, bigint>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const now = Math.floor(Date.now()/1000)
  const today = Math.floor(now/86400)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!address) { setLastDays({}); return }
      try {
        const ids = [1,2,3]
        const result: Record<number, bigint> = {}
        for (const id of ids) {
          const d = await getLastClaimDay(address, id)
          result[id] = d
        }
        if (!cancelled) { setLastDays(result); setError(null) }
      } catch (e:any) { if (!cancelled) { setError(e.message || 'quest fetch failed') } }
    }
    load()
    return () => { cancelled = true }
  }, [address, today])

  const secondsUntilReset = useMemo(() => ((today+1)*86400) - now, [today, now])

  const run = useCallback(async (fn: ()=>Promise<`0x${string}`>, id:number) => {
    if (!address) return
    setLoading(true); setError(null)
    try {
      await fn()
      setLastDays(prev => ({ ...prev, [id]: BigInt(today) }))
    } catch (e:any) { setError(e.message || 'claim failed') }
    finally { setLoading(false) }
  }, [address, today])

  return {
    claimedShare: lastDays[1] === BigInt(today),
    claimedQuizPlay: lastDays[2] === BigInt(today),
    claimedChallenge: lastDays[3] === BigInt(today),
    claimShare: () => run(claimShare, 1),
    claimDailyQuizPlay: () => run(claimDailyQuizPlay, 2),
    claimDailyChallenge: () => run(claimDailyChallenge, 3),
    loading, error, secondsUntilReset
  }
}
