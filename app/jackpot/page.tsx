"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { getWalletTotalPoints } from "@/lib/tpoints";

// Config
const REQUIRED_T_POINTS = 100_000;
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

function pickWeightedPrize(): { label: string; value: number } {
  const total = 10_000; // basis points
  let r = Math.floor(Math.random() * total) + 1;
  for (const p of PRIZE_WEIGHTS) {
    if (r <= p.bp) return { label: p.label, value: p.value };
    r -= p.bp;
  }
  return { label: "Better luck", value: 0 }; // fallback
}

export default function JackpotPage() {
  const { address } = useAccount();
  const [walletPoints, setWalletPoints] = useState<number | null>(null);
  const [lastSpinTs, setLastSpinTs] = useState<number | null>(null);
  const [result, setResult] = useState<{ label: string; value: number } | null>(null);
  const [forcedPrize, setForcedPrize] = useState<{ label: string; value: number } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0); // radians current
  const [startAngle] = useState(0);
  const [spinStart, setSpinStart] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = 300; // radius
  const upDuration = 1200; // ms accel
  const downDuration = 4000; // ms decel

  // Load points
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!address) { setWalletPoints(null); return; }
      const pts = await getWalletTotalPoints(address);
      if (!cancelled) setWalletPoints(pts);
    }
    load();
    return () => { cancelled = true; };
  }, [address]);

  // Load last spin ts
  useEffect(() => {
    if (!address) { setLastSpinTs(null); return; }
    const raw = localStorage.getItem(LAST_SPIN_KEY_PREFIX + address);
    setLastSpinTs(raw ? Number(raw) : null);
  }, [address]);

  const spunWithin24h = useMemo(() => lastSpinTs ? (Date.now() - lastSpinTs) < 24*60*60*1000 : false, [lastSpinTs]);
  const hasEnough = (walletPoints || 0) >= REQUIRED_T_POINTS;
  const eligible = !!address && hasEnough && !spunWithin24h;

  // Pre-pick weighted prize when eligible (once per day)
  useEffect(() => {
    if (eligible && !forcedPrize) {
      setForcedPrize(pickWeightedPrize());
    }
  }, [eligible, forcedPrize]);

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

  // Spin handler
  const startSpin = useCallback(() => {
    if (!eligible || spinning || finished) return;
    setResult(null);
    setFinished(false);
    setSpinning(true);
    setSpinStart(performance.now());
    if (address) {
      localStorage.setItem(LAST_SPIN_KEY_PREFIX + address, String(Date.now()));
      setLastSpinTs(Date.now());
    }
  }, [eligible, spinning, finished, address]);

  // Click detection on center button
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = size;
    const centerY = size;
    const dist = Math.hypot(x - centerX, y - centerY);
    if (dist <= 50) {
      startSpin();
    }
  }, [startSpin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center py-8">
      <div className="container mx-auto px-3 sm:px-4 flex flex-col items-center gap-6 w-full">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/brain-small.svg" alt="Brain" className="w-12 h-12 mb-1 drop-shadow" />
          <h1 className="text-5xl sm:text-6xl font-extrabold text-[#2d1b2e]">Jackpot</h1>
          <p className="text-base sm:text-lg text-[#5a3d5c]">Spin for a chance at the 10,000,000 $TRIV JACKPOT!</p>
          <p className="text-xs sm:text-sm text-[#7a567c]">Requires {REQUIRED_T_POINTS.toLocaleString()} T Points. One spin per 24h.</p>
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
              {address && !hasEnough && <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e]">Need {REQUIRED_T_POINTS.toLocaleString()} T Points. You have {(walletPoints||0).toLocaleString()}.</div>}
              {address && hasEnough && spunWithin24h && <div className="bg-white/70 backdrop-blur p-4 rounded border border-[#DC8291] text-[#2d1b2e]">Already spun. Next: {lastSpinTs && new Date(lastSpinTs + 24*60*60*1000).toLocaleTimeString()}</div>}
            </div>
          )}
        </div>
        {result && (
          <div className="mt-2 w-full max-w-md bg-gradient-to-r from-[#FFE4EC] to-[#FFC4D1] rounded-lg p-4 border border-[#F4A6B7] shadow">
            <h2 className="text-xl font-bold text-[#2d1b2e] mb-1">Result</h2>
            {result.value > 0 ? (
              <p className="text-[#5a3d5c]">You won <span className="font-bold text-[#DC8291]">{result.value.toLocaleString()} $TRIV</span> 🎉 (UI only)</p>
            ) : (
              <p className="text-[#5a3d5c]">{result.label} — no prize this time.</p>
            )}
            <p className="mt-2 text-xs text-[#7a567c]">Secure awarding not implemented. Use a contract call or backend signature flow.</p>
          </div>
        )}
        <div className="mt-4 text-xs text-center text-[#7a567c] max-w-xl">
          <p>Jackpot odds are enforced client-side by weighted selection before animation. For production, move selection + award on-chain or server-side and verify eligibility to prevent tampering.</p>
        </div>
      </div>
    </div>
  );
}
