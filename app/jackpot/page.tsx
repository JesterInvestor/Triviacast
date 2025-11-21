"use client";

import React from "react";
import StakingWidget from "../../components/StakingWidget";
import WagmiWalletConnect from "../../components/WagmiWalletConnect";
import { useConnect, useAccount } from "wagmi";

/**
 * Jackpot page without the countdown timer.
 * Includes an inline, responsive Megapot widget optimized for mobile.
 *
 * If you have a real ../../components/Megapot component, remove the local Megapot below
 * and restore the import:
 *   import Megapot from "../../components/Megapot";
 */

export default function JackpotPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] p-4 sm:p-8">
      <div
        className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center bg-white/80 backdrop-blur px-6 sm:px-8 py-8 sm:py-12 rounded-2xl border border-[#F4A6B7] shadow-lg"
        role="region"
        aria-label="Jackpot"
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2d1b2e] mb-4">Jackpot</h1>

        <div className="mb-4 w-full">
          <ConnectControls />
        </div>

        <p className="text-sm sm:text-lg text-[#5a3d5c] mb-6 max-w-2xl">
          Only for players with 100,000 T points and 60 iQ. Connect your wallet to view Megapot
          balances and claim rules.
        </p>

        <div className="w-full flex flex-col items-center gap-6">
          <div className="rounded-xl bg-gradient-to-b from-white/60 to-white/30 px-4 py-4 sm:px-6 sm:py-5 border border-[#F4A6B7] shadow-md w-full">
            <div className="text-sm uppercase tracking-wider text-[#6b4460] mb-2">Jackpot info</div>
            <p className="text-xs sm:text-sm text-[#7a516d]">
              The jackpot mechanics and claiming UI are available when connected. Participate by
              connecting your wallet and following the on-screen steps.
            </p>
          </div>

          <p className="text-xl sm:text-2xl font-bold text-[#DC8291]">
            Get Triviacasting and share + claim daily!
          </p>
        </div>

        {/* Responsive Megapot widget */}
        <Megapot />

        {/* Staking widget */}
        <div className="w-full mt-6">
          <StakingWidget />
        </div>
      </div>
    </main>
  );
}

/* Inline, responsive Megapot placeholder component.
   - Stacks vertically on small screens
   - Uses grid for balance info with responsive columns
   - Buttons are full-width on mobile and inline on larger screens
   Replace this with your real components/Megapot when ready. */
function Megapot() {
  return (
    <section
      className="w-full mt-6 rounded-lg bg-gradient-to-b from-white/70 to-white/40 border border-[#f4c0cc] p-4 sm:p-6 shadow-sm"
      aria-label="Megapot widget"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex-none w-12 h-12 rounded-full bg-[#ffeaf0] flex items-center justify-center border border-[#f2bccb]">
              <span className="text-[#b84d6a] font-extrabold">M</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm uppercase text-[#6b4460] tracking-wide">Megapot</div>
              <div className="text-base sm:text-lg font-semibold text-[#9b3550] truncate">
                Mega rewards & referral pool
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            <div className="flex flex-col">
              <div className="text-xs text-[#6b4460]">Total balance</div>
              <div className="text-sm sm:text-base font-medium text-[#4f2332]">— T</div>
            </div>
            <div className="flex flex-col">
              <div className="text-xs text-[#6b4460]">Referral pool</div>
              <div className="text-sm sm:text-base font-medium text-[#4f2332]">— T</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-[#7a516d]">
            Connect your wallet to view precise balances and eligibility rules.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
          <button
            className="w-full sm:w-auto px-3 py-2 rounded bg-white border text-sm shadow-sm hover:bg-gray-50"
            aria-label="View megapot details"
          >
            View
          </button>
          <button
            className="w-full sm:w-auto px-3 py-2 rounded bg-[#F4A6B7] text-white font-semibold text-sm shadow-sm hover:brightness-95"
            aria-label="Claim megapot"
          >
            Claim
          </button>
        </div>
      </div>
    </section>
  );
}

function ConnectControls() {
  const { connectors, connect } = useConnect();
  const { isConnected } = useAccount();

  if (isConnected) {
    return <WagmiWalletConnect />;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="text-sm text-[#7a516d]">Connect wallet to participate:</div>
      <div className="flex gap-2 flex-wrap">
        {connectors.map((c) => (
          <button
            key={c.id}
            onClick={() => connect({ connector: c })}
            disabled={!c.ready}
            className="px-3 py-2 rounded bg-white border text-sm shadow-sm"
            title={c.name}
          >
            {c.name}
            {!c.ready ? " (unavailable)" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}