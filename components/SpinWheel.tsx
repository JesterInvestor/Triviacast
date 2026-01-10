"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  isSpinWheelConfigured,
  canUserSpin,
  getPrizeInfo,
  spin,
  formatTimeUntilSpin,
  formatPrize,
  PrizeType,
  type SpinStatus,
  type PrizeInfo,
} from "@/lib/spinwheel";
import { getWalletTotalPoints } from "@/lib/tpoints";

const REQUIRED_T_POINTS = 10000;

// Custom toast helper using the existing Triviacast toast system
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', description?: string) {
  const fullMessage = description ? `${message}: ${description}` : message;
  window.dispatchEvent(new CustomEvent('triviacast:toast', {
    detail: { type, message: fullMessage }
  }));
}

interface SpinResult {
  type: PrizeType;
  amount: bigint;
}

interface SpinWheelProps {
  onSpinComplete?: (prizeType: PrizeType, amount: bigint) => void;
}

export function SpinWheel({ onSpinComplete }: SpinWheelProps) {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [prizeInfo, setPrizeInfo] = useState<PrizeInfo | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tPoints, setTPoints] = useState<number>(0);
  const [lastSpinResult, setLastSpinResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!isSpinWheelConfigured() || !isConnected || !address) {
      setIsLoading(false);
      return;
    }

    loadData();
  }, [address, isConnected]);

  // Countdown timer
  useEffect(() => {
    if (!status || status.canSpin) return;

    const interval = setInterval(() => {
      if (address) {
        canUserSpin(address).then(setStatus).catch(console.error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [status, address]);

  async function loadData() {
    if (!address) return;

    try {
      setIsLoading(true);
      const [statusData, prizeData, points] = await Promise.all([
        canUserSpin(address),
        getPrizeInfo(),
        getWalletTotalPoints(address),
      ]);
      setStatus(statusData);
      setPrizeInfo(prizeData);
      setTPoints(points);
    } catch (error) {
      console.error("Failed to load spin wheel data:", error);
      showToast("Failed to load spin wheel", "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSpin() {
    if (!address || isSpinning) return;

    console.log("Spin started - address:", address, "T Points:", tPoints, "Required:", REQUIRED_T_POINTS);

    // Check T points requirement
    if (tPoints < REQUIRED_T_POINTS) {
      showToast("Insufficient T Points", "error", 
        `You need ${REQUIRED_T_POINTS.toLocaleString()} T Points to spin. You have ${tPoints.toLocaleString()}.`
      );
      return;
    }

    setIsSpinning(true);
    setShowResult(false);
    try {
      console.log("Calling spin() contract function...");
      const hash = await spin();
      console.log("Spin tx submitted, hash:", hash);
      
      // Simulate spin animation (3-5 seconds)
      await new Promise(resolve => setTimeout(resolve, 4000));
      console.log("Animation complete, generating result...");
      
      // Determine result based on random chance
      const randomRoll = Math.random() * 100;
      let result: SpinResult;
      
      if (randomRoll < 50) {
        // Small prize (50%)
        result = { type: PrizeType.SMALL_PRIZE, amount: prizeInfo?.smallPrize || 0n };
        showToast("🎉 You Won!", "success", `${formatPrize(result.amount)} $TRIV`);
      } else if (randomRoll < 55) {
        // Big prize (5%)
        result = { type: PrizeType.BIG_PRIZE, amount: prizeInfo?.bigPrize || 0n };
        showToast("🤑 HUGE WIN!", "success", `${formatPrize(result.amount)} $TRIV`);
      } else {
        // No prize (45%)
        result = { type: PrizeType.NO_PRIZE, amount: 0n };
        showToast("Better luck next time!", "info", "Come back tomorrow to spin again");
      }
      
      setLastSpinResult(result);
      setShowResult(true);
      console.log("Result set:", result, "showResult should be true now");
      onSpinComplete?.(result.type, result.amount);

      // Refresh status after spinning
      setTimeout(() => {
        loadData();
      }, 2000);
    } catch (error: any) {
      console.error("Spin failed:", error);
      
      if (error.message?.includes("cooldown")) {
        showToast("Please wait before spinning again", "error");
      } else if (error.message?.includes("no T points")) {
        showToast("You need T Points to spin", "error", "Complete quizzes to earn T Points");
      } else if (error.message?.includes("does not match the target chain") || error.message?.includes("ChainMismatchError")) {
        showToast("Wrong Network", "error", "Please switch your wallet to Base mainnet to spin");
      } else {
        showToast("Spin failed", "error", error.message || "Please try again");
      }
    } finally {
      setIsSpinning(false);
    }
  }

  if (!isSpinWheelConfigured()) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Daily Spin Wheel</h3>
        <p className="text-muted-foreground mb-4">
          Connect your wallet to spin for prizes
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/2 mx-auto mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(3600deg); }
        }
        .wheel-spinning {
          animation: spin 4s cubic-bezier(0.25, 0.1, 0.25, 1);
        }
      `}</style>
      
      <h3 className="text-2xl font-bold mb-4 text-center">🎡 Daily Spin Wheel</h3>

      {/* Prize Info */}
      {prizeInfo && (
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
            <div className="text-yellow-500 font-semibold">Big Prize (5%)</div>
            <div className="text-xl font-bold">
              {formatPrize(prizeInfo.bigPrize)} $TRIV
            </div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-blue-500 font-semibold">Small Prize (50%)</div>
            <div className="text-xl font-bold">
              {formatPrize(prizeInfo.smallPrize)} $TRIV
            </div>
          </div>
        </div>
      )}

      {/* Spinning Wheel */}
      <div className="flex justify-center mb-6">
        <div className="relative w-48 h-48">
          {/* Wheel */}
          <div
            className={`w-full h-full rounded-full border-4 border-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center ${
              isSpinning ? "wheel-spinning" : ""
            }`}
            style={{
              background: `conic-gradient(
                from 0deg,
                #f87171 0% 45%,
                #3b82f6 45% 95%,
                #facc15 95% 100%
              )`,
            }}
          >
            {/* Center Circle */}
            <div className="absolute w-12 h-12 bg-white rounded-full border-4 border-gray-800 flex items-center justify-center">
              <div className="text-lg font-bold">$</div>
            </div>
          </div>
          
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
            <div className="w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-purple-600"></div>
          </div>
        </div>
      </div>

      {/* Result Display */}
      {showResult && lastSpinResult && (
        <div className="mb-6 p-4 rounded-lg border-2 border-purple-500 bg-purple-50 text-center">
          {lastSpinResult.type === PrizeType.NO_PRIZE ? (
            <div>
              <div className="text-2xl mb-2">😢</div>
              <div className="font-bold text-lg text-gray-800">No Prize This Time</div>
              <div className="text-sm text-gray-600">Come back tomorrow!</div>
            </div>
          ) : lastSpinResult.type === PrizeType.BIG_PRIZE ? (
            <div>
              <div className="text-3xl mb-2">🤑🎉</div>
              <div className="font-bold text-xl text-yellow-600">JACKPOT!</div>
              <div className="text-2xl font-bold text-yellow-500">
                {formatPrize(lastSpinResult.amount)} $TRIV
              </div>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-bold text-lg text-blue-600">You Won!</div>
              <div className="text-xl font-bold text-blue-500">
                {formatPrize(lastSpinResult.amount)} $TRIV
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spin Button */}
      <div className="mb-4">
        <button
          onClick={handleSpin}
          disabled={isSpinning || tPoints < REQUIRED_T_POINTS}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {isSpinning ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-3"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Spinning...
            </span>
          ) : (
            "🎰 SPIN THE WHEEL"
          )}
        </button>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>• 50% chance: {prizeInfo && formatPrize(prizeInfo.smallPrize)} $TRIV</p>
        <p>• 5% chance: {prizeInfo && formatPrize(prizeInfo.bigPrize)} $TRIV</p>
        <p>• 45% chance: No prize</p>
        <p className="pt-2 font-semibold">Requires {REQUIRED_T_POINTS.toLocaleString()} T Points • Testing (cooldown disabled)</p>
        {tPoints < REQUIRED_T_POINTS && (
          <p className="pt-1 text-red-500 font-semibold">You have {tPoints.toLocaleString()} T Points (need {(REQUIRED_T_POINTS - tPoints).toLocaleString()} more)</p>
        )}
      </div>
    </div>
  );
}
