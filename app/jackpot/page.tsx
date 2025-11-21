"use client";

import React from "react";
import StakingWidget from "../../components/StakingWidget";
import Megapot from "../../components/Megapot";
import WagmiWalletConnect from "../../components/WagmiWalletConnect";
import { useConnect, useAccount } from "wagmi";

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

        {/* Megapot (moved above staking widget) */}
        <Megapot />

        {/* Staking widget */}
        <StakingWidget />
      </div>
    </main>
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