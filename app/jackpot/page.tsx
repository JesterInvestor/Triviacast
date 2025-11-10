"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { useJackpot, useExplorerTxUrl } from '@/lib/hooks/useJackpot';
import { getWalletTotalPoints } from "@/lib/tpoints";

// Config
const REQUIRED_T_POINTS = 100_000;
const TRIV_DECIMALS = 18;
// Provide TRIV token address via env; normalize checksum to satisfy viem strict address validation
import { getAddress } from 'viem';
const RAW_TRIV_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS || '';
let USDC_ADDRESS: `0x${string}`;
try {
  // keep the hook param name `usdcAddress` for minimal changes; pass TRIV here
  USDC_ADDRESS = getAddress(RAW_TRIV_ADDRESS) as `0x${string}`;
} catch {
  USDC_ADDRESS = RAW_TRIV_ADDRESS.toLowerCase() as `0x${string}`;
}
const LAST_SPIN_KEY_PREFIX = "jackpot:lastSpin:";

// Weighted prize table (basis points out of 10,000)
const PRIZE_WEIGHTS: Array<{ label: string; value: number; bp: number }> = [
  { label: "10,000,000 $TRIV JACKPOT", value: 10_000_000, bp: 1 },      // 0.01%
  { label: "10,000 $TRIV", value: 10_000, bp: 49 },                    // 0.49%
  { label: "1,000 $TRIV", value: 1_000, bp: 950 },                     // 9.5%
  { label: "100 $TRIV", value: 100, bp: 3000 },                        // 30%
  { label: "Better luck", value: 0, bp: 6000 }                         // 60%
];

// Visual wheel slices (does not need to reflect weights exactly; winner forced)
const WHEEL_SEGMENTS = [
  "Better luck", "100 $TRIV", "1,000 $TRIV", "Better luck", "10,000 $TRIV", "Better luck",
  "100 $TRIV", "Better luck", "1,000 $TRIV", "Better luck", "10,000 $TRIV", "Better luck",
  "100 $TRIV", "Better luck", "1,000 $TRIV", "Better luck", "10,000,000 $TRIV JACKPOT", "Better luck"
];

// Colors repeated
const SEGMENT_COLORS = ["#EE4040", "#F0CF50", "#815CD1", "#3DA5E0", "#34A24F", "#F9AA1F", "#EC3F3F", "#FF9000"]; // will mod index

// On-chain randomness now determines the prize (forcedPrize comes from SpinResult event).

export default function JackpotPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, switchChainAsync, isPending: switchingChain, error: switchError } = useSwitchChain();
  const isOnBase = chainId === base.id;
  const chainLabel = useMemo(() => {
    if (!chainId) return 'Unknown';
    if (chainId === base.id) return `Base mainnet (${base.id})`;
    if (chainId === mainnet.id) return `Ethereum mainnet (${mainnet.id})`;
    return `Chain ${chainId}`;
  }, [chainId]);
  const [walletPoints, setWalletPoints] = useState<number | null>(null);
  const [lastSpinTs, setLastSpinTs] = useState<number | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [approveCustom, setApproveCustom] = useState<string>("");
  const [result, setResult] = useState<{ label: string; value: number } | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  // forcedPrize is provided by hook now
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0); // radians current
  const [startAngle] = useState(0);
  const [spinStart, setSpinStart] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = 300; // radius
  const upDuration = 1200; // ms accel
  const downDuration = 4000; // ms decel
  // Eligibility and hook for blockchain interactions
  // Cooldown (local storage only for now); TODO: integrate on-chain lastSpinAt mapping for authoritative timestamp
  const spunWithin24h = useMemo(() => lastSpinTs ? (Date.now() - lastSpinTs) < 24*60*60*1000 : false, [lastSpinTs]);
  const nextSpinAt = useMemo(() => lastSpinTs ? lastSpinTs + 24*60*60*1000 : null, [lastSpinTs]);
  const pointsKnown = walletPoints !== null;
  const hasEnough = (walletPoints || 0) >= REQUIRED_T_POINTS;
  // If points are unknown (API/contract not configured), don't block; on-chain will enforce
  const eligible = !!address && (!pointsKnown || hasEnough) && !spunWithin24h;
  // Fallback UI priceUnits (contract enforces 25,000 TRIV)
  const priceUnits = 25000n * (10n ** 18n);
  const jackpot = useJackpot({ usdcAddress: USDC_ADDRESS, priceUnits, eligible });
  const {
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
    hasAllowanceForSpin,
    canApprove,
    canRequestSpin,
  canRequestSpinPaying,
    doApprove,
    requestSpin,
  requestSpinPaying,
    buyOneSpin,
    buySpins,
    approveAmount,
    forceBuySpins,
  previewBuySpins,
    jackpotAddrValid,
    lastSpinAt,
    balanceError,
    allowanceError,
    priceUnits: contractPriceUnits,
    feeReceiver,
    contractUsdc,
    simulateDisabled,
  } = jackpot as any;
    const { preflightOk, preflightError } = (jackpot as any);
  const priceTrivDisplay = useMemo(() => {
    const units = contractPriceUnits ?? priceUnits;
    return String(units / (10n ** 18n))
  }, [contractPriceUnits, priceUnits]);
  const approveLink = useExplorerTxUrl(approveTxHash);
  const spinLink = useExplorerTxUrl(spinTxHash);
  const buyLink = useExplorerTxUrl(buyTxHash);

  const requireBase = useCallback(async () => {
    if (!address) {
      setNetworkError('Connect your wallet to continue.');
      return false;
    }
    if (isOnBase) {
      setNetworkError(null);
      return true;
    }
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: base.id });
        setNetworkError(null);
        return true;
      }
      if (switchChain) {
        switchChain({ chainId: base.id });
        setNetworkError('Approve the Base network switch in your wallet to continue.');
      } else {
        setNetworkError('Switch to Base mainnet in your wallet to continue.');
      }
    } catch (err: any) {
      const message = err?.shortMessage || err?.message || 'Switch to Base mainnet to continue.';
      setNetworkError(message);
    }
    return false;
  }, [address, isOnBase, switchChain, switchChainAsync]);

  const runWithBase = useCallback(
    async (action: () => Promise<void> | void) => {
      if (!(await requireBase())) return;
      await action();
    },
    [requireBase],
  );

  useEffect(() => {
    if (isOnBase) {
      setNetworkError(null);
    }
  }, [isOnBase]);

  // (balance, allowance, credits managed by hook)

  // Load wallet trivia points
  useEffect(() => {
    let cancelled = false;
    async function loadPoints() {
      if (!address) { setWalletPoints(null); return; }
      const pts = await getWalletTotalPoints(address);
      if (!cancelled) setWalletPoints(pts);
    }
    loadPoints();
    return () => { cancelled = true; };
  }, [address]);

  // Load last spin ts
  useEffect(() => {
    if (!address) { setLastSpinTs(null); return; }
    const raw = localStorage.getItem(LAST_SPIN_KEY_PREFIX + address);
    setLastSpinTs(raw ? Number(raw) : null);
  }, [address]);

  // Reconcile with on-chain cooldown if available (seconds -> ms)
  useEffect(() => {
    if (!address || !lastSpinAt) return;
    const chainMs = Number(lastSpinAt) * 1000;
    if (!lastSpinTs || chainMs > lastSpinTs) {
      setLastSpinTs(chainMs);
    }
  }, [address, lastSpinAt]);

  // (moved above)

  // Start the visual spin once we have a forcedPrize from VRF
  const startSpin = useCallback(() => {
    if (!eligible || spinning || finished || !forcedPrize) return;
    setResult(null);
    setFinished(false);
    setSpinning(true);
    setSpinStart(performance.now());
    if (address) {
      localStorage.setItem(LAST_SPIN_KEY_PREFIX + address, String(Date.now()));
      setLastSpinTs(Date.now());
    }
  }, [eligible, spinning, finished, address, forcedPrize]);

  // Start animation when prize arrives
  useEffect(() => {
    if (forcedPrize && eligible && !spinning && !finished) {
      startSpin();
    }
  }, [forcedPrize, eligible, spinning, finished, startSpin]);

  // No pre-pick: prize waits for VRF event.

  // Draw wheel
  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, currentAngle: number) => {
    const segments = WHEEL_SEGMENTS.length;
    const centerX = size;
    const centerY = size;
    ctx.clearRect(0, 0, size*2, size*2);
    ctx.lineWidth = 1;
    const sliceAngle = (Math.PI * 2) / segments;
    for (let i=0;i<segments;i++) {
      const start = currentAngle + i*sliceAngle;
      const end = start + sliceAngle;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, size, start, end);
      ctx.closePath();
      ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "#2d1b2e";
      ctx.stroke();
      // Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(start + sliceAngle/2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      const label = WHEEL_SEGMENTS[i];
      ctx.fillText(label.substring(0,20), size*0.55, 0);
      ctx.restore();
    }
    // Center button circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, Math.PI*2);
    ctx.closePath();
    ctx.fillStyle = '#2d1b2e';
    ctx.fill();
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#FFE4EC';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(spinning ? 'Spinning' : eligible ? 'Spin' : 'Locked', centerX, centerY);
    // Needle
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY - size - 10);
    ctx.lineTo(centerX + 20, centerY - size - 10);
    ctx.lineTo(centerX, centerY - size - 50);
    ctx.closePath();
    ctx.fillStyle = '#2d1b2e';
    ctx.fill();
  }, [eligible, size, spinning]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame: number;
    const startTs = spinStart;
    const animate = (ts: number) => {
      if (spinning && startTs) {
        const elapsed = ts - startTs;
        let localAngle = angle;
        // Accel phase
        if (elapsed < upDuration) {
          const progress = elapsed / upDuration;
          const speed = progress * 0.4; // radians per frame approx
          localAngle += speed;
        } else {
          // Decel phase
          const downElapsed = elapsed - upDuration;
          if (downElapsed < downDuration) {
            const progress = downElapsed / downDuration;
            const speed = (1 - progress) * 0.4;
            localAngle += speed;
          } else {
            // Finish: snap to forced prize
            const finalIndex = WHEEL_SEGMENTS.findIndex(s => s === forcedPrize?.label);
            if (finalIndex >= 0) {
              const sliceAngle = (Math.PI*2)/WHEEL_SEGMENTS.length;
              // Needle at top => angle offset so that selected segment center aligns with needle
              const targetAngle = (Math.PI/2) - (finalIndex * sliceAngle + sliceAngle/2);
              localAngle = targetAngle;
            }
            setSpinning(false);
            setFinished(true);
            setResult(forcedPrize || { label: 'Better luck', value: 0 });
          }
        }
        setAngle(localAngle);
        drawWheel(ctx, localAngle);
      } else {
        drawWheel(ctx, angle);
      }
      frame = requestAnimationFrame(animate);
    };
    drawWheel(ctx, angle);
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [angle, spinning, spinStart, drawWheel, forcedPrize]);

  // (startSpin defined earlier)

  // Click detection on center button
  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = size;
    const centerY = size;
  const dist = Math.hypot(x - centerX, y - centerY);
  // Expand clickable radius for accessibility (visual center button is 50px)
  if (dist <= 85) {
      await runWithBase(async () => {
        if (!hasAllowanceForSpin && !approving) {
          await doApprove();
        } else if (hasAllowanceForSpin && (credits || 0n) === 0n && !buying) {
          await buyOneSpin();
        } else if (hasAllowanceForSpin && (credits || 0n) > 0n && !spinConfirming && !waitingVRF) {
          await requestSpin();
        }
      });
    }
  }, [requireBase, doApprove, hasAllowanceForSpin, approving, credits, buying, spinConfirming, waitingVRF, requestSpin, buyOneSpin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center py-8 relative">
      {/* Network indicator + switch */}
      <div className="mb-3 w-full flex items-center justify-center px-4">
        <div className={`flex items-center gap-2 ${isOnBase ? 'bg-[#34A24F]/15 border-[#34A24F]' : 'bg-white/80 border-[#DC8291]'} backdrop-blur border text-[#2d1b2e] rounded px-3 py-2 shadow`}> 
          <span className="text-sm">Network: <span className={`font-semibold ${isOnBase ? 'text-[#1f7e38]' : 'text-[#b14f5f]'}`}>{chainLabel}</span></span>
          {!isOnBase && (
            <button
              onClick={() => switchChain?.({ chainId: base.id })}
              disabled={switchingChain}
              className="bg-[#2d1b2e] text-[#FFE4EC] px-3 py-1 rounded text-sm disabled:opacity-50"
            >{switchingChain ? 'Switching…' : 'Switch to Base'}</button>
          )}
        </div>
      </div>
      {networkError && (
        <div className="-mt-2 mb-3 text-xs text-center text-red-600 px-4">{networkError}</div>
      )}

      {/* Action bar for accessibility / alternative to center click */}
      {eligible && (
        <div className="mb-4 flex flex-wrap gap-2 items-center justify-center w-full px-4">
          {!hasAllowanceForSpin && !approving && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <button
                onClick={async (e)=>{
                  e.stopPropagation();
                  if (approving) return;
                  await runWithBase(() => doApprove());
                }}
                className="bg-[#2d1b2e] text-[#FFE4EC] px-4 py-2 rounded shadow disabled:opacity-50 text-sm"
                disabled={approving || !canApprove}
              >{approving ? 'Approving…' : `Approve ${priceTrivDisplay} $TRIV`}</button>
              <div className="flex gap-1 flex-wrap max-w-[240px]">
                {[25000,50000,100000].map(v => {
                  const units = BigInt(v) * (10n ** 18n)
                  return (
                    <button
                      key={v}
                      disabled={approving}
                      onClick={async (e)=>{
                        e.stopPropagation();
                        await runWithBase(() => approveAmount(units));
                      }}
                      className="text-[10px] bg-[#DC8291] hover:bg-[#c86e7c] disabled:opacity-50 px-2 py-1 rounded"
                      title={`Approve ${v.toLocaleString()} $TRIV`}
                    >{v.toLocaleString()}</button>
                  )
                })}
                <button
                  disabled={approving}
                  onClick={async (e)=>{
                    e.stopPropagation();
                    await runWithBase(() => approveAmount(0n));
                  }}
                  className="text-[10px] bg-[#7a567c] hover:bg-[#6a4e70] disabled:opacity-50 px-2 py-1 rounded"
                  title="Reset allowance to 0"
                >0</button>
              </div>
              <div className="flex items-center gap-1">
                <label htmlFor="approveCustom" className="sr-only">Custom approve ($TRIV)</label>
                <input
                  id="approveCustom"
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min={1}
                  placeholder="Custom TRIV"
                  value={approveCustom}
                  onChange={(e)=> setApproveCustom(e.target.value)}
                  className="w-20 text-[12px] px-2 py-1 rounded border border-[#DC8291] bg-white/80 text-[#2d1b2e]"
                />
                <button
                  disabled={approving || !approveCustom}
                  onClick={async (e)=>{
                    e.stopPropagation();
                    const v = Number(approveCustom);
                    if (isNaN(v) || v <= 0) return;
                    const clamped = Math.max(1, Math.min(10000000, v));
                    const units = BigInt(Math.round(clamped)) * (10n ** 18n);
                    await runWithBase(() => approveAmount(units));
                  }}
                  className="text-[12px] bg-[#2d1b2e] text-[#FFE4EC] px-2 py-1 rounded disabled:opacity-50"
                >Approve</button>
              </div>
            </div>
          )}
          {!jackpotAddrValid && (
            <span className="text-[11px] text-red-600">Missing NEXT_PUBLIC_JACKPOT_ADDRESS</span>
          )}
          {hasAllowanceForSpin && (credits||0n)===0n && !buying && (
            <div className="flex items-center gap-2">
              <button
                onClick={async (e)=>{
                  e.stopPropagation();
                  if (buying) return;
                  await runWithBase(() => buyOneSpin());
                }}
                className="bg-[#DC8291] text-[#FFE4EC] px-4 py-2 rounded shadow text-sm disabled:opacity-50"
                disabled={buying}
              >Buy 1 Spin</button>
              <button
                onClick={async (e)=>{
                  e.stopPropagation();
                  if (!confirm('Attempt preview (simulate) even though global simulate disabled? May fail if RPC rate-limited.')) return;
                  await runWithBase(() => previewBuySpins(1n));
                }}
                className="bg-[#2d1b2e] text-[#FFE4EC] px-3 py-2 rounded shadow text-sm disabled:opacity-50"
                disabled={buying}
                title="Preview buy (force simulate)"
              >Preview Buy 1</button>
              <button
                onClick={async (e)=>{
                  e.stopPropagation();
                  if (!confirm('Send without simulate? This may reveal revert only after wallet signs.')) return;
                  await runWithBase(() => forceBuySpins(1n));
                }}
                className="bg-[#7a567c] text-white px-3 py-2 rounded shadow text-sm disabled:opacity-50"
                disabled={buying}
                title="Force send without simulate (debug)"
              >Force Buy 1 (no sim)</button>
            </div>
          )}
          {hasAllowanceForSpin && (credits||0n)>0n && !spinConfirming && !waitingVRF && (
            <button
              onClick={async (e)=>{
                e.stopPropagation();
                await runWithBase(() => requestSpin());
              }}
              className="bg-[#34A24F] text-white px-4 py-2 rounded shadow text-sm disabled:opacity-50"
              disabled={!canRequestSpin || spinning}
            >{spinning ? 'Spinning…' : 'Spin Now'}</button>
          )}
          {hasAllowanceForSpin && (credits||0n)===0n && !spinConfirming && !waitingVRF && (
            <button
              onClick={async (e)=>{
                e.stopPropagation();
                await runWithBase(() => requestSpinPaying());
              }}
              className="bg-[#34A24F]/80 hover:bg-[#34A24F] text-white px-4 py-2 rounded shadow text-sm disabled:opacity-50"
              disabled={!canRequestSpinPaying || spinning}
            >{spinning ? 'Spinning…' : 'Spin & Pay (no credit)'}
            </button>
          )}
          <button
            onClick={(e)=>{e.stopPropagation(); setShowDebug(d=>!d);}}
            className="bg-[#2d1b2e]/70 text-[#FFE4EC] px-3 py-1 rounded text-[11px]"
          >Debug</button>
        </div>
      )}
      {/* Persistent credits badge */}
      {address && hasAllowanceForSpin && (
        <div className="fixed top-2 right-2 z-50 flex flex-col items-end gap-1">
          <div className="bg-[#2d1b2e]/80 text-[#FFE4EC] px-3 py-2 rounded shadow flex items-center gap-2">
            <span className="text-xs font-semibold">Credits: {(credits||0n).toString()}</span>
            {/* Contract enforces count==1; hide multi-buy shortcuts */}
            <div className="flex gap-1"></div>
          </div>
          {buying && <div className="text-[10px] text-[#2d1b2e] bg-white/70 backdrop-blur px-2 py-1 rounded shadow">Purchasing…</div>}
          {buyError && <div className="text-[10px] text-red-600 bg-white/80 px-2 py-1 rounded shadow max-w-[180px] break-words">{buyError}</div>}
          {!buyError && networkError && <div className="text-[10px] text-red-600 bg-white/80 px-2 py-1 rounded shadow max-w-[180px] break-words">{networkError}</div>}
        </div>
      )}
      <div className="container mx-auto px-3 sm:px-4 flex flex-col items-center gap-6 w-full">
        {showDebug && (
          <div className="w-full max-w-xl text-[10px] bg-white/70 backdrop-blur border border-[#DC8291] rounded p-2 text-[#2d1b2e] flex flex-col gap-1">
            <div className="font-semibold text-[11px]">Debug State</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>Jackpot Addr Valid:</span><span>{String(jackpotAddrValid)}</span>
              <span>Chain ID:</span><span>{chainId}</span>
              <span>Jackpot Address:</span><span className="truncate max-w-[180px]">{process.env.NEXT_PUBLIC_JACKPOT_ADDRESS || '—'}</span>
              <span>Price (units):</span><span>{contractPriceUnits ? contractPriceUnits.toString() : '—'}</span>
              <span>Price (TRIV):</span><span>{priceTrivDisplay}</span>
              <span>Contract TRIV:</span><span className="truncate max-w-[180px]">{contractUsdc || '—'}</span>
              <span>Fee Receiver:</span><span className="truncate max-w-[180px]">{feeReceiver || '—'}</span>
              <span>Simulate Disabled:</span><span>{String(simulateDisabled)}</span>
              <span>TRIV Balance:</span><span>{usdcBalance !== null ? usdcBalance.toString() : 'null'} {balanceError && '(err)'}</span>
              <span>Balance Error:</span><span className="truncate max-w-[140px]">{balanceError||'—'}</span>
              <span>Allowance:</span><span>{usdcAllowance !== null ? usdcAllowance.toString() : 'null'} {allowanceError && '(err)'}</span>
              <span>Allowance Error:</span><span className="truncate max-w-[140px]">{allowanceError||'—'}</span>
              <span>Has Allowance:</span><span>{String(hasAllowanceForSpin)}</span>
              <span>Can Approve:</span><span>{String(canApprove)}</span>
              <span>Can Request Spin:</span><span>{String(canRequestSpin)}</span>
              <span>Credits:</span><span>{credits !== null ? credits.toString() : 'null'}</span>
              <span>Approving:</span><span>{String(approving)}</span>
              <span>Buying:</span><span>{String(buying)}</span>
              <span>SpinConfirming:</span><span>{String(spinConfirming)}</span>
              <span>WaitingVRF:</span><span>{String(waitingVRF)}</span>
              <span>Forced Prize:</span><span>{forcedPrize ? forcedPrize.label : '—'}</span>
              <span>Local Last Spin:</span><span>{lastSpinTs ? new Date(lastSpinTs).toLocaleTimeString() : '—'}</span>
              <span>On-chain Last Spin:</span><span>{lastSpinAt ? new Date(Number(lastSpinAt)*1000).toLocaleTimeString() : '—'}</span>
              <span>Cooldown Active:</span><span>{String(spunWithin24h)}</span>
              <span>Next Spin:</span><span>{nextSpinAt ? new Date(nextSpinAt).toLocaleTimeString() : '—'}</span>
              <span>Preflight TRIV:</span><span>{preflightOk === null ? '—' : String(preflightOk)}</span>
              <span>Preflight Error:</span><span className="truncate max-w-[140px]">{preflightError || '—'}</span>
            </div>
            <button onClick={()=>{localStorage.removeItem(LAST_SPIN_KEY_PREFIX + address); setLastSpinTs(null);}} className="mt-2 bg-[#DC8291] text-[#FFE4EC] px-2 py-1 rounded">Reset Local Cooldown</button>
          </div>
        )}
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/brain-small.svg" alt="Brain" className="w-12 h-12 mb-1 drop-shadow" />
          <h1 className="text-5xl sm:text-6xl font-extrabold text-[#2d1b2e]">Jackpot</h1>
          <p className="text-base sm:text-lg text-[#5a3d5c]">Spin for a chance at the 10,000,000 $TRIV JACKPOT!</p>
          <p className="text-xs sm:text-sm text-[#7a567c]">Requires {REQUIRED_T_POINTS.toLocaleString()} T Points + pays {priceTrivDisplay} $TRIV (approve then spin).</p>
          <div className="text-[11px] sm:text-xs text-[#2d1b2e] bg-white/70 backdrop-blur px-3 py-2 rounded border border-[#F4A6B7] max-w-[640px]">
            <span className="font-semibold">Note:</span> One spin every 24 hours per wallet. The cooldown resets when your last spin’s VRF result arrives. Unused spin credits persist until you use them.
          </div>
          {spunWithin24h && nextSpinAt && (
            <p className="text-[11px] text-[#DC8291]">Cooldown active · Next spin: {new Date(nextSpinAt).toLocaleTimeString()}</p>
          )}
        </div>
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={size*2}
            height={size*2}
            onClick={handleCanvasClick}
            className={`rounded-full ${eligible ? '' : 'blur-sm'} transition`}
          />
          {!eligible && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {!address && <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e]">Connect a wallet to spin.</div>}
              {address && pointsKnown && !hasEnough && (
                <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e]">
                  Need {REQUIRED_T_POINTS.toLocaleString()} T Points. You have {(walletPoints||0).toLocaleString()}.
                </div>
              )}
              {address && !pointsKnown && (
                <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e] text-center max-w-xs">
                  Couldn’t verify T Points right now. You can still try to spin; eligibility is enforced on-chain.
                </div>
              )}
              {address && hasEnough && spunWithin24h && <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e]">Already spun. Next: {nextSpinAt && new Date(nextSpinAt).toLocaleTimeString()}</div>}
            </div>
          )}
          {eligible && approving && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e] max-w-xs animate-pulse">
                <p className="font-semibold mb-1">Approving TRIV…</p>
                {approveTxHash && <p className="text-[10px] break-all">Tx: <a className="underline" href={approveLink||'#'} target="_blank" rel="noreferrer">{approveTxHash.slice(0,10)}…</a></p>}
                {approveError && <p className="mt-1 text-xs text-red-600">{approveError}</p>}
              </div>
            </div>
          )}
          {eligible && !approving && !hasAllowanceForSpin && (
            <div className="absolute inset-0 flex items-start justify-end p-2 pointer-events-none">
              <div className="bg-white/80 backdrop-blur px-3 py-2 rounded border border-[#DC8291] text-[#2d1b2e] max-w-[260px] shadow">
                <p className="font-semibold text-sm">Approve TRIV for spins</p>
                <p className="text-[11px]">Current needed: {priceTrivDisplay} $TRIV (per spin)</p>
                <p className="text-[11px]">Balance: {usdcBalance !== null ? (Number(usdcBalance / (10n ** 18n))).toLocaleString() : '…'} $TRIV</p>
                {approveError && <p className="mt-1 text-[11px] text-red-600">{approveError}</p>}
                <p className="mt-1 text-[10px] text-[#7a567c]">Use quick approve buttons above to set a higher allowance then buy spins.</p>
              </div>
            </div>
          )}
          {eligible && hasAllowanceForSpin && (credits||0n)===0n && !buying && !spinConfirming && !waitingVRF && !spinning && !finished && (
            <div className="absolute inset-0 flex flex-col items-end justify-start p-2 gap-1">
              <span className="text-[10px] bg-[#2d1b2e] text-[#FFE4EC] px-2 py-1 rounded">Approved ✓ Buy spins</span>
              <div className="flex flex-col gap-1 text-[10px]">
                <button onClick={async (e)=>{e.stopPropagation(); await runWithBase(() => buySpins(1n));}} className="bg-[#DC8291] text-[#FFE4EC] px-2 py-1 rounded shadow">Buy 1</button>
              </div>
            </div>
          )}
          {eligible && hasAllowanceForSpin && buying && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e] max-w-xs animate-pulse">
                <p className="font-semibold mb-1">Purchasing spin…</p>
                {buyTxHash && <p className="text-[10px] break-all">Tx: <a className="underline" href={buyLink||'#'} target="_blank" rel="noreferrer">{buyTxHash.slice(0,10)}…</a></p>}
                {buyError && <p className="mt-1 text-xs text-red-600">{buyError}</p>}
              </div>
            </div>
          )}
          {eligible && hasAllowanceForSpin && (credits||0n)>0n && !spinConfirming && !waitingVRF && !spinning && !finished && (
            <div className="absolute inset-0 flex items-start justify-end p-2">
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[10px] bg-[#2d1b2e] text-[#FFE4EC] px-2 py-1 rounded">Credits: {(credits||0n).toString()}</span>
                <div className="flex gap-1 flex-wrap max-w-[140px]">
                  {/* Multi-buy removed */}
                </div>
              </div>
            </div>
          )}
          {eligible && hasAllowanceForSpin && (credits||0n)===0n && !spinConfirming && !waitingVRF && !spinning && !finished && (
            <div className="absolute inset-0 flex items-start justify-end p-2">
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[10px] bg-[#2d1b2e] text-[#FFE4EC] px-2 py-1 rounded">No credits · Use Spin & Pay</span>
                <div className="flex gap-1 flex-wrap max-w-[140px]">
                  <button onClick={async (e)=>{e.stopPropagation(); await runWithBase(() => requestSpinPaying());}} className="text-[10px] bg-[#34A24F] text-white px-2 py-1 rounded">Spin & Pay</button>
                </div>
              </div>
            </div>
          )}
          {eligible && spinConfirming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e] max-w-xs animate-pulse">
                <p className="font-semibold mb-1">Submitting spin transaction…</p>
                {spinTxHash && <p className="text-[10px] break-all">Tx: <a className="underline" href={spinLink||'#'} target="_blank" rel="noreferrer">{spinTxHash.slice(0,10)}…</a> (waiting receipt)</p>}
                {spinError && <p className="mt-1 text-xs text-red-600">{spinError}</p>}
              </div>
            </div>
          )}
          {eligible && waitingVRF && !spinConfirming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e] max-w-xs">
                <p className="font-semibold mb-1">Waiting for VRF randomness…</p>
                {spinTxHash && <p className="text-[10px] break-all">Spin Tx: <a className="underline" href={spinLink||'#'} target="_blank" rel="noreferrer">{spinTxHash.slice(0,10)}…</a> confirmed</p>}
                <p className="mt-1 text-[10px] text-[#7a567c]">Fulfillment typically 1-2 blocks.</p>
              </div>
            </div>
          )}
        </div>
        {result && (
          <div className="mt-2 w-full max-w-md bg-gradient-to-r from-[#FFE4EC] to-[#FFC4D1] rounded-lg p-4 border border-[#F4A6B7] shadow">
            <h2 className="text-xl font-bold text-[#2d1b2e] mb-1">Result</h2>
            {result.value > 0 ? (
              <p className="text-[#5a3d5c]">Prize: <span className="font-bold text-[#DC8291]">{result.value.toLocaleString()} $TRIV</span> 🎉 (from on-chain SpinResult)</p>
            ) : (
              <p className="text-[#5a3d5c]">{result.label} — no prize this time (on-chain result).</p>
            )}
            <p className="mt-2 text-xs text-[#7a567c]">Ensure Jackpot contract is funded with enough $TRIV for large prizes.</p>
          </div>
        )}
        <div className="mt-4 text-xs text-center text-[#7a567c] max-w-xl">
          <p>Flow: approve TRIV → request spin (VRF) → wait for SpinResult event → wheel animates to the returned prize.</p>
        </div>
      </div>
    </div>
  );
}
