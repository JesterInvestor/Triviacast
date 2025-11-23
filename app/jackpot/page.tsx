"use client";

import React from "react";
import StakingWidget from "../../components/StakingWidget";
import WagmiWalletConnect from "../../components/WagmiWalletConnect";
import { useConnect, useAccount } from "wagmi";
import {
  Jackpot as MegapotJackpot,
  MainnetJackpotName,
  MegapotProvider,
  JACKPOT,
} from "@coordinationlabs/megapot-ui-kit";
import { base } from "viem/chains";
import JackpotBanner from "../../components/JackpotBanner";

export default function JackpotPage() {
  // Resolve megapot contract info if available (mainnet only)
  const mainnetJackpotContract = JACKPOT[base.id]?.[MainnetJackpotName.USDC];

  return (
    <>
      {/* banner placed outside the centered container */}
      <JackpotBanner />
      {/* full-screen center container */}
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] p-8">
        {/* card centered and constrained */}
        <div
          className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center bg-white/80 backdrop-blur px-8 py-12 rounded-2xl border border-[#F4A6B7] shadow-lg"
          style={{ overflowX: "auto" }} /* Ensure horizontal scrolling for overflow */
          role="region"
          aria-label="Jackpot section"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] mb-4">
            Jackpot is Here!!!
          </h1>
          <div className="mb-4">
            <ConnectControls />
          </div>
          <p className="text-lg sm:text-xl text-[#5a3d5c] mb-6">
            Only 1 USDC per ticket. Only for players with 100,000 T points and 60
            iQ soon. Get T points and iQ!!!
          </p>

          {/* Removed countdown */}
          <div style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
            <MegapotWrapper>
              <div className="w-full flex flex-col items-center gap-4">
                {/* Base Mainnet */}
                {mainnetJackpotContract && (
                  <MegapotJackpot
                    contract={mainnetJackpotContract}
                    style={{
                      width: "100%",
                      minWidth: "300px", // Ensuring a minimum width for scrollability
                    }}
                  />
                )}
              </div>
            </MegapotWrapper>
          </div>

          {/* Staking widget inserted below the megapot UI */}
          <StakingWidget />

          {/* Small external debug link (keeps layout unchanged) */}
          <div className="mt-4">
            <a
              href="https://triviacast.xyz/farcaster-debug"
              className="text-sm text-[#7a516d] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Farcaster debug
            </a>
          </div>
        </div>
      </main>
    </>
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
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * MegapotWrapper exists so we can insert a provider/context later if needed.
 * Kept minimal for now to preserve layout.
 */
function MegapotWrapper({ children }: { children: React.ReactNode }) {
  return <div style={{ width: "100%" }}>{children}</div>;
}