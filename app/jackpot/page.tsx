"use client";

import React, { useEffect, useMemo, useState } from "react";
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

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function JackpotPage() {
  // Fixed target: Nov 22, 2025 at 00:00 (midnight) in the user's local timezone.
  // If you prefer UTC midnight, replace with: Date.UTC(2025, 10, 22, 0, 0, 0)
  const target = useMemo(() => new Date("2025-11-22T00:00:00").getTime(), []);

  const [remainingMs, setRemainingMs] = useState(Math.max(0, target - Date.now()));

  useEffect(() => {
    const tick = () => {
      const rem = Math.max(0, target - Date.now());
      setRemainingMs(rem);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

  const hoursTotal = days * 24 + hours;
  const finished = remainingMs <= 0;

  // Resolve megapot contract info if available (mainnet only)
  const mainnetJackpotContract = JACKPOT[base.id]?.[MainnetJackpotName.USDC];

  // Read wallet/account info to get iQ from the connected wallet (address-based lookup)
  const { address, isConnected } = useAccount();

  // User stats (tPoints and iQ). iQ is read using the connected wallet address when available.
  // This implementation expects iQ to be available in browser storage keyed by address (e.g. localStorage key `iQ_<address>`).
  // tPoints are read from localStorage key `tPoints` (or `tPoints_<address>` when available).
  // Replace these lookups with your real data source (on-chain call, API, or secure storage) as needed.
  const [tPoints, setTPoints] = useState<number>(0);
  const [iQ, setIQ] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Try address-scoped keys first (when wallet connected), otherwise fall back to global keys
    const tPointsKey = address ? `tPoints_${address}` : "tPoints";
    const iQKey = address ? `iQ_${address}` : "iQ";

    const storedTP = Number(localStorage.getItem(tPointsKey) ?? localStorage.getItem("tPoints") ?? 0);
    const storedIQ = Number(localStorage.getItem(iQKey) ?? localStorage.getItem("iQ") ?? 0);

    setTPoints(Number.isFinite(storedTP) ? storedTP : 0);
    setIQ(Number.isFinite(storedIQ) ? storedIQ : 0);
  }, [address, isConnected]);

  // Gate only by tPoints and iQ (no countdown gating)
  const meetsThresholds = tPoints >= 100000 && iQ >= 60;

  return (
    // full-screen center container
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] p-8">
      {/* card centered and constrained */}
      <div
        className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center bg-white/80 backdrop-blur px-8 py-12 rounded-2xl border border-[#F4A6B7] shadow-lg"
        role="region"
        aria-label="Jackpot countdown"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] mb-4">Jackpot coming soon.....</h1>
        <div className="mb-4">
          <ConnectControls />
        </div>
        <p className="text-lg sm:text-xl text-[#5a3d5c] mb-6">Only for players with 100,000 T points and 60 iQ.</p>

        <div className="w-full flex flex-col items-center gap-6">
          <div className="rounded-xl bg-gradient-to-b from-white/60 to-white/30 px-6 py-5 border border-[#F4A6B7] shadow-md w-full">
            <div className="text-sm uppercase tracking-wider text-[#6b4460] mb-4">Time remaining</div>

            {/* center the countdown row */}
            <div className="w-full flex items-center justify-center gap-4 sm:gap-6">
              <div className="flex flex-col items-center">
                <div className="text-xs text-[#7a516d] mb-2">Days</div>
                <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-lg bg-[#ffeaf0] flex items-center justify-center border border-[#f2bccb] shadow-inner">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#b84d6a]">{days}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <TimeBlock label="Hours" value={pad(hoursTotal)} />
                <Separator />
                <TimeBlock label="Minutes" value={pad(minutes)} />
                <Separator />
                <TimeBlock label="Seconds" value={pad(seconds)} />
              </div>
            </div>
          </div>

          {finished ? (
            <div className="mt-2 text-green-700 font-semibold">The jackpot is live! Claim now 🎉</div>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold text-[#DC8291] animate-pulse">Get Triviacasting and share + claim daily!</p>
          )}
        </div>

        <div aria-live="polite" className="sr-only">
          {finished
            ? "Jackpot is live"
            : `Time remaining: ${days} days, ${pad(hoursTotal)} hours, ${pad(minutes)} minutes, ${pad(seconds)} seconds`}
        </div>

        {/* Megapot jackpot UI - gated only by tPoints and iQ (uses wallet address to read iQ when connected) */}
        <div className="w-full mt-6">
          <MegapotWrapper>
            <div className="w-full flex flex-col items-center gap-4">
              {meetsThresholds ? (
                mainnetJackpotContract ? (
                  <MegapotJackpot contract={mainnetJackpotContract} />
                ) : (
                  <div className="text-sm text-[#7a516d]">Jackpot contract not configured for this network.</div>
                )
              ) : (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-left w-full">
                  <div className="font-semibold text-[#7a516d] mb-1">Access requirements not met</div>
                  <div className="text-sm text-[#6b4460]">
                    This jackpot is available only to players with at least <strong>100,000 T points</strong> and <strong>60 iQ</strong>.
                  </div>
                  <div className="mt-2 text-sm text-[#6b4460]">
                    Your stats: <strong>{tPoints.toLocaleString()} T points</strong>, <strong>{iQ} iQ</strong>.
                  </div>
                </div>
              )}
            </div>
          </MegapotWrapper>
        </div>

        {/* Staking widget inserted below the megapot UI */}
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
