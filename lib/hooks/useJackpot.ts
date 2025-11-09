import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { getAddress } from 'viem'
import { wagmiConfig } from '@/lib/wagmi'
import { JACKPOT_ADDRESS, approveUsdc, getUsdcAllowance, spinJackpot, onSpinResult, prizeToLabel, ERC20_ABI, getSpinCredits, buySpin, buySpinNoSim, buySpinWithSim, getLastSpinAt, getPrice, getFeeReceiver, getUsdcToken } from '@/lib/jackpot'
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
    // Base mainnet only
    const baseUrl = chainId === 8453 ? 'https://basescan.org' : null
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
  const [contractPrice, setContractPrice] = useState<bigint | null>(null)
  const [feeReceiver, setFeeReceiver] = useState<`0x${string}` | null>(null)
  const [contractUsdc, setContractUsdc] = useState<`0x${string}` | null>(null)
  const simulateDisabled = String(process.env.NEXT_PUBLIC_DISABLE_SIMULATE || '').toLowerCase() === 'true'
  const [usdcDecimals, setUsdcDecimals] = useState<number | null>(null)
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

  // contract price
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const p = await getPrice()
        if (!cancelled) setContractPrice(p)
      } catch { if (!cancelled) setContractPrice(null) }
      try {
        const fr = await getFeeReceiver()
        if (!cancelled) setFeeReceiver(fr)
      } catch { if (!cancelled) setFeeReceiver(null) }
      try {
        const u = await getUsdcToken()
        if (!cancelled) setContractUsdc(u)
      } catch { if (!cancelled) setContractUsdc(null) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // token decimals (for sanity)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const d = await readContract(wagmiConfig, {
          address: params.usdcAddress,
          abi: ERC20_ABI as any,
          functionName: 'decimals',
          args: []
        }) as number
        if (!cancelled) setUsdcDecimals(d)
      } catch { if (!cancelled) setUsdcDecimals(null) }
    }
    load()
    return () => { cancelled = true }
  }, [params.usdcAddress])

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
  const effectivePrice = contractPrice ?? params.priceUnits
  const hasBalanceForSpin = (usdcBalance || 0n) >= effectivePrice
  const hasAllowanceForSpin = (usdcAllowance || 0n) >= effectivePrice
  const canApprove = !!address && jackpotAddrValid && !approving && hasBalanceForSpin && !hasAllowanceForSpin && params.eligible
  const canRequestSpin = !!address && hasAllowanceForSpin && params.eligible && !waitingVRF && !spinConfirming

  const doApprove = useCallback(async () => {
    if (!canApprove || !address) return
    setApproveError(null)
    setApproving(true)
    try {
      // Normalize addresses before calls to avoid checksum errors
  const usdcAddr = getAddress(params.usdcAddress)
  const ownerAddr = getAddress(address)
  const hash = await approveUsdc(usdcAddr as `0x${string}`, ownerAddr as `0x${string}`, effectivePrice)
      setApproveTxHash(hash)
      // wait for confirmation (best effort)
      try {
        const { waitForTransactionReceipt } = await import('@wagmi/core')
        await waitForTransactionReceipt(wagmiConfig, { hash })
      } catch {}
      // refresh allowance
      const alw = await getUsdcAllowance(usdcAddr as `0x${string}`, ownerAddr as `0x${string}`)
      setUsdcAllowance(alw)
    } catch (e: any) {
      setApproveError(e?.message || 'Approve failed')
    } finally { setApproving(false) }
  }, [canApprove, address, params.usdcAddress, effectivePrice])

  // Custom approve arbitrary amount (in USDC smallest units) for multi-buy convenience
  const approveAmount = useCallback(async (amount: bigint) => {
    if (!address) return
    setApproveError(null)
    setApproving(true)
    try {
      const usdcAddr = getAddress(params.usdcAddress)
      const ownerAddr = getAddress(address)
      const hash = await approveUsdc(usdcAddr as `0x${string}`, ownerAddr as `0x${string}`, amount)
      setApproveTxHash(hash)
      try {
        const { waitForTransactionReceipt } = await import('@wagmi/core')
        await waitForTransactionReceipt(wagmiConfig, { hash })
      } catch {}
      const alw = await getUsdcAllowance(usdcAddr as `0x${string}`, ownerAddr as `0x${string}`)
      setUsdcAllowance(alw)
    } catch (e: any) {
      setApproveError(e?.message || 'Approve failed')
    } finally { setApproving(false) }
  }, [address, params.usdcAddress])

  const buyOneSpin = useCallback(async () => {
    return buySpins(1n)
  }, [])

  const buySpins = useCallback(async (count: bigint) => {
    if (!address) return
    setBuyError(null)
    setBuying(true)
    setBuyTxHash(null)
    try {
      // Pre-check allowance/balance for multi-buy
      const required = (contractPrice ?? params.priceUnits) * count
      if (usdcAllowance !== null && usdcAllowance < required) {
        setBuyError(`Insufficient allowance: approved ${usdcAllowance.toString()} < required ${required.toString()} for ${count.toString()} spins. Approve more USDC to continue.`)
        return
      }
      if (usdcBalance !== null && usdcBalance < required) {
        setBuyError(`Insufficient USDC balance: have ${usdcBalance.toString()} < required ${required.toString()} for ${count.toString()} spins.`)
        return
      }
      let hash: `0x${string}`
      try {
        hash = await buySpin(address, count)
      } catch (e: any) {
        const m = e?.message || ''
        // Auto-fallback if simulate is rate-limited or preview RPC rejects sim
        if (/over rate limit|429|HTTP request failed/i.test(m)) {
          hash = await buySpinNoSim(address, count)
        } else {
          throw e
        }
      }
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
      // Attempt friendly mapping for common custom errors
      const msg: string = e?.message || 'Buy spin failed'
      let friendly = msg
      if (/TooSoon\(/.test(msg)) friendly = 'Cooldown active: one spin per 24h.'
      else if (/NotEligible\(/.test(msg)) friendly = 'Not eligible: insufficient Trivia Points.'
      else if (/PaymentFailed\(/.test(msg)) friendly = 'Payment failed: USDC transferFrom did not succeed (check approval, balance, or feeReceiver).'
      else if (/NoSubscription\(/.test(msg)) friendly = 'VRF subscription missing: contract not added as consumer or subId=0.'
      setBuyError(friendly)
    } finally {
      setBuying(false)
    }
  }, [address, contractPrice, params.priceUnits, usdcAllowance, usdcBalance])

  const forceBuySpins = useCallback(async (count: bigint) => {
    if (!address) return
    setBuyError(null)
    setBuying(true)
    setBuyTxHash(null)
    try {
      const hash = await buySpinNoSim(address, count)
      setBuyTxHash(hash)
      try {
        const { waitForTransactionReceipt } = await import('@wagmi/core')
        await waitForTransactionReceipt(wagmiConfig, { hash })
      } catch {}
      try {
        const c = await getSpinCredits(address)
        setCredits(c)
      } catch {}
    } catch (e: any) {
      setBuyError(e?.message || 'Buy spin failed (no simulate)')
    } finally {
      setBuying(false)
    }
  }, [address])

  // Try a previewed buy (forces a simulate even if globally disabled). If RPC rejects sim (429), surface a helpful error.
  const previewBuySpins = useCallback(async (count: bigint) => {
    if (!address) return
    setBuyError(null)
    setBuying(true)
    setBuyTxHash(null)
    try {
      let hash: `0x${string}`
      try {
        hash = await buySpinWithSim(address, count)
      } catch (e: any) {
        const m = e?.message || ''
        if (/over rate limit|429|HTTP request failed|estimate/i.test(m)) {
          throw new Error('Preview not available right now (RPC rate-limited). You can still complete the purchase using the normal Buy button or Force Buy (no sim).')
        }
        throw e
      }
      setBuyTxHash(hash)
      try {
        const { waitForTransactionReceipt } = await import('@wagmi/core')
        await waitForTransactionReceipt(wagmiConfig, { hash })
      } catch {}
      try {
        const c = await getSpinCredits(address)
        setCredits(c)
      } catch {}
    } catch (e: any) {
      setBuyError(e?.message || 'Preview buy failed')
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
  forceBuySpins,
  previewBuySpins,
  approveAmount,
    jackpotAddrValid,
    lastSpinAt,
    balanceError,
    allowanceError,
    priceUnits: effectivePrice,
    feeReceiver,
    contractUsdc,
    usdcDecimals,
    simulateDisabled,
  }
}
