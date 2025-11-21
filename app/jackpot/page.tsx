"use client";

import React, { useEffect, useState } from "react";
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

export default function JackpotPage() {
  // Resolve megapot contract info if available (mainnet only)
  const mainnetJackpotContract = JACKPOT[base.id]?.[MainnetJackpotName.USDC];

  // Read wallet/account info to get iQ / tPoints from the connected wallet (address-based lookup)
  const { address, isConnected } = useAccount();

  // User stats (tPoints and iQ). We'll attempt to read tPoints the same way the leaderboard does:
  // - address-scoped localStorage key like `tPoints_<address>`
  // - fallback to global `tPoints`
  // - try to parse a `leaderboard` localStorage key (array/object) to find the address entry
  // - as a last resort try a backend endpoint `/api/leaderboard?address=...` (gracefully ignore failures)
  const [tPoints, setTPoints] = useState<number>(0);
  const [iQ, setIQ] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function resolveStats() {
      if (typeof window === "undefined") return;
      setLoadingStats(true);

      const normalize = (a?: string | null) => (a ? a.toLowerCase() : "");

      const addr = address ? normalize(address) : "";

      // Helpers
      const parseNumber = (v: unknown) => {
        const n = Number(v ?? 0);
        return Number.isFinite(n) ? n : 0;
      };

      // 1) Try address-scoped tPoints key
      const tryLocalAddressKey = () => {
        if (!addr) return null;
        const key = `tPoints_${addr}`;
        const raw = localStorage.getItem(key);
        if (raw != null) return parseNumber(raw);
        return null;
      };

      // 2) Try global tPoints key
      const tryGlobalTP = () => {
        const raw = localStorage.getItem("tPoints");
        if (raw != null) return parseNumber(raw);
        return null;
      };

      // 3) Try address-scoped iQ key
      const tryIQAddressKey = () => {
        if (!addr) return null;
        const key = `iQ_${addr}`;
        const raw = localStorage.getItem(key);
        if (raw != null) return parseNumber(raw);
        return null;
      };

      // 4) Try global iQ key
      const tryGlobalIQ = () => {
        const raw = localStorage.getItem("iQ");
        if (raw != null) return parseNumber(raw);
        return null;
      };

      // 5) Try parsing a leaderboard JSON stored in localStorage under several likely keys.
      const tryLeaderboardLocal = () => {
        const candidateKeys = ["leaderboard", "leaderboard_v1", "leaderboard_v2", "leaderboardData"];
        for (const k of candidateKeys) {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            // If parsed is an array, look for entry with address-like field
            if (Array.isArray(parsed)) {
              for (const entry of parsed) {
                if (!entry) continue;
                const entryAddr =
                  (entry.address ?? entry.addr ?? entry.wallet ?? entry.account ?? "").toString().toLowerCase();
                if (addr && entryAddr === addr) {
                  // possible field names for points
                  return parseNumber(entry.tPoints ?? entry.points ?? entry.score ?? entry.tp ?? entry.value);
                }
              }
            } else if (typeof parsed === "object" && parsed !== null) {
              // it might be a mapping object keyed by address
              const byAddr =
                parsed[addr] ??
                parsed[address ?? ""] ??
                Object.values(parsed).find((val: any) => {
                  const a = (val?.address ?? val?.addr ?? "").toString().toLowerCase();
                  return a === addr;
                });
              if (byAddr) return parseNumber(byAddr.tPoints ?? byAddr.points ?? byAddr.score ?? byAddr.tp ?? byAddr.value);
            }
          } catch (e) {
            // ignore parse errors
          }
        }
        return null;
      };

      // 6) Try backend API (best-effort, ignore errors)
      const tryBackend = async () => {
        if (!addr) return null;
        try {
          // This endpoint may or may not exist in your app; it's a best-effort attempt.
          const resp = await fetch(`/api/leaderboard?address=${encodeURIComponent(address || "")}`);
          if (!resp.ok) return null;
          const json = await resp.json();
          // Expecting shape { tPoints: number } or { points: number } etc
          return parseNumber(json?.tPoints ?? json?.points ?? json?.score ?? json?.tp ?? json?.value);
        } catch (e) {
          return null;
        }
      };

      // Resolve tPoints: try in order
      let resolvedTP: number | null =
        tryLocalAddressKey() ??
        tryLeaderboardLocal() ??
        tryGlobalTP(); // leaderboard local prioritized over global TP

      if ((resolvedTP === null || resolvedTP === 0) && addr) {
        // attempt backend only if we don't have a non-zero local value
        const backendTP = await tryBackend();
        if (backendTP != null) resolvedTP = backendTP;
      }

      // Resolve iQ similarly (prefer address-scoped)
      let resolvedIQ: number | null =
        tryIQAddressKey() ??
        tryGlobalIQ();

      // If still missing try leaderboard local for iQ field
      if ((resolvedIQ === null || resolvedIQ === 0)) {
        // attempt to parse iQ from leaderboard entries
        try {
          const candidateKeys = ["leaderboard", "leaderboard_v1", "leaderboard_v2", "leaderboardData"];
          for (const k of candidateKeys) {
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                for (const entry of parsed) {
                  if (!entry) continue;
                  const entryAddr =
                    (entry.address ?? entry.addr ?? entry.wallet ?? entry.account ?? "").toString().toLowerCase();
                  if (addr && entryAddr === addr) {
                    resolvedIQ = parseNumber(entry.iQ ?? entry.iq ?? entry.IQ ?? entry.level ?? entry.rank ?? entry.score);
                    break;
                  }
                }
              } else if (typeof parsed === "object" && parsed !== null) {
                const byAddr =
                  parsed[addr] ??
                  parsed[address ?? ""] ??
                  Object.values(parsed).find((val: any) => {
                    const a = (val?.address ?? val?.addr ?? "").toString().toLowerCase();
                    return a === addr;
                  });
                if (byAddr) {
                  resolvedIQ = parseNumber(byAddr.iQ ?? byAddr.iq ?? byAddr.IQ ?? byAddr.level ?? byAddr.rank ?? byAddr.score);
                }
              }
              if (resolvedIQ != null && resolvedIQ !== 0) break;
            } catch (e) {
              // ignore parse errors
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // If still missing, try backend for iQ
      if ((resolvedIQ === null || resolvedIQ === 0) && addr) {
        try {
          const resp = await fetch(`/api/leaderboard?address=${encodeURIComponent(address || "")}`);
          if (resp.ok) {
            const json = await resp.json();
            resolvedIQ = parseNumber(json?.iQ ?? json?.iq ?? json?.IQ ?? json?.level ?? json?.rank ?? json?.score);
          }
        } catch (e) {
          // ignore
        }
      }

      if (!mounted) return;
      setTPoints(resolvedTP ?? 0);
      setIQ(resolvedIQ ?? 0);
      setLoadingStats(false);
    }

    resolveStats();

    return () => {
      mounted = false;
    };
  }, [address, isConnected]);

  // Gate only by tPoints and iQ
  const meetsThresholds = tPoints >= 100000 && iQ >= 60;

  return (
    // full-screen center container
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] p-8">
      {/* card centered and constrained */}
      <div
        className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center bg-white/80 backdrop-blur px-8 py-12 rounded-2xl border border-[#F4A6B7] shadow-lg"
        role="region"
        aria-label="Jackpot"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] mb-4">Jackpot</h1>
        <div className="mb-4">
          <ConnectControls />
        </div>
        <p className="text-lg sm:text-xl text-[#5a3d5c] mb-6">Only for players with 100,000 T points and 60 iQ.</p>

        <div className="w-full flex flex-col items-center gap-6">
          {/* Megapot jackpot UI - gated only by tPoints and iQ (uses wallet address to read iQ when connected) */}
          <div className="w-full mt-2">
            <MegapotWrapper>
              <div className="w-full flex flex-col items-center gap-4">
                {loadingStats ? (
                  <div className="text-sm text-[#7a516d]">Loading your stats...</div>
                ) : meetsThresholds ? (
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
                    {!isConnected && (
                      <div className="mt-2 text-sm text-[#6b4460]">Connect your wallet to load address-scoped stats.</div>
                    )}
                  </div>
                )}
              </div>
            </MegapotWrapper>
          </div>

          {/* Staking widget */}
          <StakingWidget />
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
            {c.name}
            {!c.ready ? " (unavailable)" : ""}
          </button>
        ))}
      </div>
    </div>
  );
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
