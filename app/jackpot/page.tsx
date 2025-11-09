"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import dynamic from "next/dynamic";
import { getWalletTotalPoints } from "@/lib/tpoints";

// Dynamically import to ensure client-side only (library references window.innerWidth)
const WheelComponent = dynamic<any>(
  () => import("react-wheel-of-prizes").then((m: any) => m.default || m),
  { ssr: false }
);

// Threshold to be eligible to spin
const REQUIRED_T_POINTS = 100_000;
// LocalStorage key prefix
const LAST_SPIN_KEY_PREFIX = "jackpot:lastSpin:";

// Visual segments to render on the wheel (odds are enforced separately via winningSegment)
const buildSegments = (): string[] => {
  return [
    "Better luck", "100 $TRIV", "1,000 $TRIV", "Better luck", "10,000 $TRIV", "Better luck",
    "100 $TRIV", "Better luck", "1,000 $TRIV", "Better luck", "10,000 $TRIV", "Better luck",
    "100 $TRIV", "Better luck", "1,000 $TRIV", "Better luck", "10,000,000 $TRIV JACKPOT", "Better luck",
    "100 $TRIV", "Better luck", "1,000 $TRIV", "Better luck", "10,000 $TRIV", "Better luck"
  ];
};

// Color palette repeated; length need not match segments exactly; mod applied in component
const SEGMENT_COLORS = [
  "#EE4040",
  "#F0CF50",
  "#815CD1",
  "#3DA5E0",
  "#34A24F",
  "#F9AA1F",
  "#EC3F3F",
  "#FF9000"
];

// Utility parse numeric prize value from segment text
function parsePrizeValue(segment: string): number {
  if (!segment.includes("$TRIV")) return 0;
  const cleaned = segment.replace(/[^0-9,]/g, "").replace(/,/g, "");
  return Number(cleaned) || 0;
}

export default function JackpotPage() {
  const { address } = useAccount();
  const [walletPoints, setWalletPoints] = useState<number | null>(null);
  const [lastSpinTs, setLastSpinTs] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [awarded, setAwarded] = useState<number>(0);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [forcedWinner, setForcedWinner] = useState<string | undefined>(undefined);

  // Load wallet points
  useEffect(() => {
    let cancelled = false;
    async function loadPoints() {
      if (!address) {
        setWalletPoints(null);
        return;
      }
      setLoadingPoints(true);
      try {
        const pts = await getWalletTotalPoints(address);
        if (!cancelled) setWalletPoints(pts);
      } finally {
        if (!cancelled) setLoadingPoints(false);
      }
    }
    loadPoints();
    return () => { cancelled = true; };
  }, [address]);

  // Load last spin timestamp from localStorage
  useEffect(() => {
    if (!address) {
      setLastSpinTs(null);
      return;
    }
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LAST_SPIN_KEY_PREFIX + address) : null;
    setLastSpinTs(raw ? Number(raw) : null);
  }, [address]);

  const now = Date.now();
  const spunWithin24h = useMemo(() => {
    if (!lastSpinTs) return false;
    return now - lastSpinTs < 24 * 60 * 60 * 1000; // 24h
  }, [lastSpinTs, now]);

  const segments = useMemo(() => buildSegments(), []);

  // Eligibility gating logic
  const hasEnoughPoints = (walletPoints || 0) >= REQUIRED_T_POINTS;
  const eligibleToSpin = !!address && hasEnoughPoints && !spunWithin24h;

  // Weighted winner selection (per session/day, before spin)
  useEffect(() => {
    if (!eligibleToSpin || forcedWinner) return;
    // weights out of 10,000
    const weights: Array<{ label: string; weight: number }> = [
      { label: "10,000,000 $TRIV JACKPOT", weight: 1 }, // 0.01%
      { label: "10,000 $TRIV", weight: 49 },            // 0.49%
      { label: "1,000 $TRIV", weight: 950 },            // 9.5%
      { label: "100 $TRIV", weight: 3000 },             // 30%
      { label: "Better luck", weight: 6000 }            // 60%
    ];
    const total = weights.reduce((s, w) => s + w.weight, 0);
    let r = Math.floor(Math.random() * total) + 1;
    let chosen = weights[weights.length - 1].label;
    for (const w of weights) {
      if (r <= w.weight) { chosen = w.label; break; }
      r -= w.weight;
    }
    setForcedWinner(chosen);
  }, [eligibleToSpin, forcedWinner]);

  const handleFinished = useCallback((segment: string) => {
    setWinner(segment);
    const prizeValue = parsePrizeValue(segment);
    setAwarded(prizeValue);
    // Record spin timestamp
    if (address && typeof window !== 'undefined') {
      localStorage.setItem(LAST_SPIN_KEY_PREFIX + address, String(Date.now()));
      setLastSpinTs(Date.now());
    }
    // Dispatch custom event so other components could refresh points if on-chain awarding implemented later
    if (prizeValue > 0) {
      window.dispatchEvent(new CustomEvent('triviacast:jackpotWon', { detail: { address, prizeValue, segment } }));
    }
  }, [address]);

  // Expected value comment (approximate): duplicates heavily favor small / no prize outcomes.
  // NOTE: Actual awarding must be secured via a backend / smart contract to prevent client-side tampering.

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center py-8">
      <div className="container mx-auto px-3 sm:px-4 flex flex-col items-center gap-6 w-full">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/brain-small.svg" alt="Brain" className="w-12 h-12 mb-1 drop-shadow" />
          <h1 className="text-5xl sm:text-6xl font-extrabold text-[#2d1b2e]">Jackpot</h1>
          <p className="text-base sm:text-lg text-[#5a3d5c]">Spin the wheel for a chance at the 10,000,000 $TRIV JACKPOT!</p>
          <p className="text-xs sm:text-sm text-[#7a567c]">Requires {REQUIRED_T_POINTS.toLocaleString()} T Points. One spin per 24h per wallet.</p>
        </div>

        <div className="relative flex flex-col items-center justify-center">
          {/* Wheel */}
          <div className={`transition filter ${eligibleToSpin ? '' : 'blur-sm'} `}>
            <WheelComponent
              segments={segments}
              segColors={SEGMENT_COLORS}
              winningSegment={forcedWinner || ""} // force odds via precomputed winner
              onFinished={handleFinished}
              primaryColor="#2d1b2e"
              contrastColor="#FFE4EC"
              buttonText={eligibleToSpin ? 'Spin' : 'Locked'}
              isOnlyOnce={true}
              size={290}
              upDuration={100}
              downDuration={1200}
              fontFamily="Arial"
            />
          </div>

          {/* Overlay messages when ineligible */}
          {!eligibleToSpin && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
              {!address && (
                <div className="bg-white/70 backdrop-blur-md rounded-lg p-4 border border-[#DC8291] shadow text-[#2d1b2e]">
                  <p className="font-semibold">Connect a wallet to spin.</p>
                </div>
              )}
              {address && !hasEnoughPoints && (
                <div className="bg-white/70 backdrop-blur-md rounded-lg p-4 border border-[#DC8291] shadow text-[#2d1b2e] max-w-xs">
                  <p className="font-semibold mb-1">Need {REQUIRED_T_POINTS.toLocaleString()} T Points.</p>
                  <p>You have {(walletPoints || 0).toLocaleString()}.</p>
                </div>
              )}
              {address && hasEnoughPoints && spunWithin24h && (
                <div className="bg-white/70 backdrop-blur-md rounded-lg p-4 border border-[#DC8291] shadow text-[#2d1b2e] max-w-xs">
                  <p className="font-semibold mb-1">Already spun today 🎡</p>
                  {lastSpinTs && (
                    <p className="text-xs">Next spin after {new Date(lastSpinTs + 24*60*60*1000).toLocaleTimeString()}</p>
                  )}
                </div>
              )}
              {loadingPoints && (
                <div className="mt-4 text-xs text-[#5a3d5c]">Loading points...</div>
              )}
            </div>
          )}
        </div>

        {/* Result */}
        {winner && (
          <div className="mt-4 w-full max-w-md bg-gradient-to-r from-[#FFE4EC] to-[#FFC4D1] rounded-lg p-4 border border-[#F4A6B7] shadow">
            <h2 className="text-xl font-bold text-[#2d1b2e] mb-1">Result</h2>
            {awarded > 0 ? (
              <p className="text-[#5a3d5c]">You won <span className="font-bold text-[#DC8291]">{awarded.toLocaleString()} $TRIV</span> 🎉 (Front-end preview only)</p>
            ) : (
              <p className="text-[#5a3d5c]">{winner} — no prize this time.</p>
            )}
            <p className="mt-2 text-xs text-[#7a567c]">Prizes must be issued by secure on-chain / backend logic (not implemented here).</p>
          </div>
        )}

        <div className="mt-6 text-xs text-center text-[#7a567c] max-w-xl">
          <p>
            Odds are weighted by segment duplication. Jackpot is intentionally very rare. This UI does not perform any on-chain distribution yet. Implement a
            trusted flow (e.g. contract function or signed backend grant) before production use.
          </p>
        </div>
      </div>
    </div>
  );
}
