"use client";

import React from "react";
import StakingWidget from "../../components/StakingWidget";
import WagmiWalletConnect from "../../components/WagmiWalletConnect";
import { useConnect, useAccount } from 'wagmi';
import {
  Jackpot as MegapotJackpot,
  MainnetJackpotName,
  MegapotProvider,
  JACKPOT,
} from '@coordinationlabs/megapot-ui-kit';
import { base } from 'viem/chains';
import JackpotBanner from "../../components/JackpotBanner";

export default function JackpotPage() {
  // Resolve megapot contract info if available (mainnet only)
  const mainnetJackpotContract = JACKPOT[base.id]?.[MainnetJackpotName.USDC];

  return (
    <main className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] p-0">
      <JackpotBanner />

      <div className="w-full flex-grow flex items-center justify-center p-8">
        <div className="w-full max-w-3xl mx-auto mt-6 flex flex-col items-center justify-center text-center bg-white/80 backdrop-blur px-8 py-12 rounded-2xl border border-[#F4A6B7] shadow-lg">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] mb-4">Jackpot</h1>

          <div className="mb-4">
            <ConnectControls />
          </div>

          <p className="text-lg sm:text-xl text-[#5a3d5c] mb-6">Participate in the mainnet jackpot.</p>

          {/* Staking widget placed above the jackpot UI */}
          <StakingWidget />

          {/* Megapot jackpot UI (mainnet only) */}
          <div className="w-full mt-6">
            <MegapotWrapper>
              <div className="w-full flex flex-col items-center gap-4">
                {mainnetJackpotContract ? (
                  <MegapotJackpot contract={mainnetJackpotContract} />
                ) : (
                  <div className="text-sm text-[#7a516d]">Mainnet jackpot not configured.</div>
                )}
              </div>
            </MegapotWrapper>
          </div>
        </div>
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
            {c.name}{!c.ready ? ' (unavailable)' : ''}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-[#7a516d] mb-2 hidden sm:block">{label}</div>
      <div className="min-w-[3.2rem] sm:min-w-[4.5rem] px-3 py-2 rounded-lg bg-[#fff0f4] border border-[#f4c0cc] shadow-md">
        <div className="text-lg sm:text-2xl font-extrabold text-[#b84d6a] tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="text-[#b38897] font-bold text-xl sm:text-2xl select-none">:</div>;
}

function MegapotWrapper({ children }: { children: React.ReactNode }) {
  const { connectors } = useConnect();

  return (
    <MegapotProvider
      onConnectWallet={() => {
        // attempt to connect using the first available connector
        try {
          connectors[0]?.connect();
        } catch (e) {
          // ignore — user can connect via UI
        }
      }}
    >
      {children}
    </MegapotProvider>
  );
}