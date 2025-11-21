"use client";

import React from "react";
import StakingWidget from "../../components/StakingWidget";
import WagmiWalletConnect from "../../components/WagmiWalletConnect";
import { useConnect, useAccount } from "wagmi";

/**
 * Jackpot page without the countdown timer.
 *
 * NOTE: Megapot component was previously missing in your build and caused a module-not-found error.
 * To ensure this file can be pasted and built immediately, I've included a small local Megapot placeholder
 * component below. If you already have a real components/Megapot, you can remove the local Megapot function
 * and import it instead (restore `import Megapot from "../../components/Megapot";`).
 */

export default function JackpotPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] p-8">
      <div
        className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center bg-white/80 backdrop-blur px-8 py-12 rounded-2xl border border-[#F4A6B7] shadow-lg"
        role="region"
        aria-label="Jackpot"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] mb-4">Jackpot</h1>

        <div className="mb-4">
          <ConnectControls />
        </div>

        <p className="text-lg sm:text-xl text-[#5a3d5c] mb-6">
          Only for players with 100,000 T points and 60 iQ.
        </p>

        <div className="w-full flex flex-col items-center gap-6">
          <div className="rounded-xl bg-gradient-to-b from-white/60 to-white/30 px-6 py-5 border border-[#F4A6B7] shadow-md w-full">
            <div className="text-sm uppercase tracking-wider text-[#6b4460] mb-2">Jackpot info</div>
            <p className="text-sm text-[#7a516d]">
              The jackpot mechanics and claiming UI are available when connected. Participate by
              connecting your wallet and following the on-screen steps.
            </p>
          </div>

          <p className="text-2xl sm:text-3xl font-bold text-[#DC8291]">
            Get Triviacasting and share + claim daily!
          </p>
        </div>

        {/* Inline Megapot placeholder (keeps the build from failing if a real component is missing) */}
        <Megapot />

        {/* Staking widget */}
        <StakingWidget />
      </div>
    </main>
  );
}

/* Simple local Megapot placeholder so this file builds immediately.
   Replace or remove this if you have ../../components/Megapot in the repo. */
function Megapot() {
  return (
    <div className="w-full max-w-2xl mt-6 rounded-lg bg-gradient-to-b from-white/70 to-white/40 border border-[#f4c0cc] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm uppercase text-[#6b4460] tracking-wide">Megapot</div>
          <div className="text-lg font-semibold text-[#9b3550]">Mega rewards & referral pool</div>
          <div className="text-xs text-[#7a516d] mt-1">
            Connect your wallet to view the Megapot balance and claim rules.
          </div>
        </div>
        <div>
          <button className="px-3 py-2 bg-white rounded border text-sm shadow-sm">View</button>
        </div>
      </div>
    </div>
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