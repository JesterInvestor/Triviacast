import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { wagmiConfig } from '@/lib/wagmi'
import { JACKPOT_ADDRESS, approveUsdc, getUsdcAllowance, spinJackpot, onSpinResult, prizeToLabel, ERC20_ABI, getSpinCredits, buySpin, getLastSpinAt } from '@/lib/jackpot'
import { readContract } from '@wagmi/core'

export type JackpotState = {
  address?: `0x${string}`
  usdcBalance: bigint | null
  usdcAllowance: bigint | null
  balanceError: string | null
  allowanceError: string | null
  approving: boolean
  approveError: string | null
  approveTxHash: `0x${string}` | null
  spinConfirming: boolean
  waitingVRF: boolean
  spinError: string | null
  spinTxHash: `0x${string}` | null
  forcedPrize: { label: string; value: number } | null
  credits: bigint | null
  buying: boolean
  buyError: string | null
  buyTxHash: `0x${string}` | null
}

export function useExplorerTxUrl(hash?: `0x${string}` | null) {
  const chainId = useChainId()
  return useMemo(() => {
    if (!hash) return null
    // Base mainnet 8453, Base Sepolia 84532
    const baseUrl = chainId === 8453
      ? 'https://basescan.org'
      : chainId === 84532
      ? 'https://sepolia.basescan.org'
      : null
    return baseUrl ? `${baseUrl}/tx/${hash}` : null
  }, [hash, chainId])
}

export function useJackpot(params: { usdcAddress: `0x${string}`; priceUnits: bigint; eligible: boolean }) {
  const { address } = useAccount()
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null)
  const [usdcAllowance, setUsdcAllowance] = useState<bigint | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [allowanceError, setAllowanceError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | null>(null)
  const [spinConfirming, setSpinConfirming] = useState(false)
  const [waitingVRF, setWaitingVRF] = useState(false)
  const [spinError, setSpinError] = useState<string | null>(null)
  const [spinTxHash, setSpinTxHash] = useState<`0x${string}` | null>(null)
  const [forcedPrize, setForcedPrize] = useState<{ label: string; value: number } | null>(null)
  const [credits, setCredits] = useState<bigint | null>(null)
  const [lastSpinAt, setLastSpinAt] = useState<bigint | null>(null)
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [buyTxHash, setBuyTxHash] = useState<`0x${string}` | null>(null)
  const unwatchRef = useRef<(() => void) | null>(null)

  // balances
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!address) { setUsdcBalance(null); return }
      try {
        const bal = await readContract(wagmiConfig, {
          address: params.usdcAddress,
          abi: ERC20_ABI as any,
          functionName: 'balanceOf',
          args: [address]
        }) as bigint
        if (!cancelled) { setUsdcBalance(bal); setBalanceError(null) }
      } catch (e: any) { if (!cancelled) { setUsdcBalance(null); setBalanceError(e?.message || 'Balance fetch failed') } }
    }
    load();
    return () => { cancelled = true }
  }, [address, params.usdcAddress])

  // allowance
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!address) { setUsdcAllowance(null); return }
      try {
        const alw = await getUsdcAllowance(params.usdcAddress, address)
        if (!cancelled) { setUsdcAllowance(alw); setAllowanceError(null) }
      } catch (e: any) { if (!cancelled) { setUsdcAllowance(null); setAllowanceError(e?.message || 'Allowance fetch failed') } }
    }
    load();
    return () => { cancelled = true }
  }, [address, params.usdcAddress])

  // credits
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!address) { setCredits(null); return }
      try {
        const c = await getSpinCredits(address)
        if (!cancelled) setCredits(c)
      } catch { if (!cancelled) setCredits(null) }
    }
    load();
    return () => { cancelled = true }
  }, [address])

  // on-chain lastSpinAt (for authoritative cooldown display)
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!address || !JACKPOT_ADDRESS) { setLastSpinAt(null); return }
      try {
        const ts = await getLastSpinAt(address)
        if (!cancelled) setLastSpinAt(ts)
      } catch { if (!cancelled) setLastSpinAt(null) }
    }
    load();
    return () => { cancelled = true }
  }, [address])

  // cleanup watcher on unmount
  useEffect(() => {
    return () => { if (unwatchRef.current) { unwatchRef.current(); unwatchRef.current = null } }
  }, [])

  // Validate jackpot address presence (empty if NEXT_PUBLIC_JACKPOT_ADDRESS not set at build/runtime)
  const jackpotAddrValid = JACKPOT_ADDRESS && JACKPOT_ADDRESS.length === 42
  const hasBalanceForSpin = (usdcBalance || 0n) >= params.priceUnits
  const hasAllowanceForSpin = (usdcAllowance || 0n) >= params.priceUnits
  const canApprove = !!address && jackpotAddrValid && !approving && hasBalanceForSpin && !hasAllowanceForSpin && params.eligible
  const canRequestSpin = !!address && hasAllowanceForSpin && params.eligible && !waitingVRF && !spinConfirming

  const doApprove = useCallback(async () => {
    if (!canApprove || !address) return
    setApproveError(null)
    setApproving(true)
    try {
      const hash = await approveUsdc(params.usdcAddress, address, params.priceUnits)
      setApproveTxHash(hash)
      // wait for confirmation (best effort)
      try {
        const { waitForTransactionReceipt } = await import('@wagmi/core')
        await waitForTransactionReceipt(wagmiConfig, { hash })
      } catch {}
      // refresh allowance
      const alw = await getUsdcAllowance(params.usdcAddress, address)
      setUsdcAllowance(alw)
    } catch (e: any) {
      setApproveError(e?.message || 'Approve failed')
    } finally { setApproving(false) }
  }, [canApprove, address, params.usdcAddress, params.priceUnits])

  const buyOneSpin = useCallback(async () => {
    return buySpins(1n)
  }, [])

  const buySpins = useCallback(async (count: bigint) => {
    if (!address) return
    setBuyError(null)
    setBuying(true)
    setBuyTxHash(null)
    try {
      const hash = await buySpin(address, count)
      setBuyTxHash(hash)
      try {
        const { waitForTransactionReceipt } = await import('@wagmi/core')
        await waitForTransactionReceipt(wagmiConfig, { hash })
      } catch {}
      // refresh credits
      try {
        const c = await getSpinCredits(address)
        setCredits(c)
      } catch {}
    } catch (e: any) {
      setBuyError(e?.message || 'Buy spin failed')
    } finally {
      setBuying(false)
    }
  }, [address])

  const requestSpin = useCallback(async () => {
    if (!canRequestSpin || !address || spinConfirming || waitingVRF) return
    setSpinError(null)
    setSpinTxHash(null)
    // subscribe before sending tx
    if (unwatchRef.current) unwatchRef.current()
    unwatchRef.current = onSpinResult(({ player, prize }) => {
      if (player?.toLowerCase() !== (address as string).toLowerCase()) return
      const label = prizeToLabel(prize)
      setForcedPrize({ label, value: Number(prize) })
      setWaitingVRF(false)
      if (unwatchRef.current) unwatchRef.current();
      unwatchRef.current = null
    })
    try {
      const hash = await spinJackpot(address)
      setSpinTxHash(hash)
      setSpinConfirming(true)
      try {
        const { waitForTransactionReceipt } = await import('@wagmi/core')
        await waitForTransactionReceipt(wagmiConfig, { hash })
      } catch {}
      setSpinConfirming(false)
      setWaitingVRF(true)
    } catch (e: any) {
      if (unwatchRef.current) { unwatchRef.current(); unwatchRef.current = null }
      setSpinConfirming(false)
      setWaitingVRF(false)
      setSpinError(e?.message || 'Spin failed')
    }
  }, [canRequestSpin, address, spinConfirming, waitingVRF])

  return {
    address,
    usdcBalance,
    usdcAllowance,
    approving,
    approveError,
    approveTxHash,
    spinConfirming,
    waitingVRF,
    spinError,
    spinTxHash,
    forcedPrize,
    credits,
    buying,
    buyError,
    buyTxHash,
    hasBalanceForSpin,
    hasAllowanceForSpin,
    canApprove,
    canRequestSpin,
    doApprove,
    requestSpin,
    buyOneSpin,
    buySpins,
    jackpotAddrValid,
    lastSpinAt,
    balanceError,
    allowanceError,
  }
}
