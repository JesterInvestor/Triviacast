"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import StakingWidget from "../../components/StakingWidget";
import WagmiWalletConnect from "../../components/WagmiWalletConnect";
import { useConnect, useAccount, useChainId } from 'wagmi';
import {
  Jackpot as MegapotJackpot,
  MainnetJackpotName,
  MegapotProvider,
  JACKPOT,
} from '@coordinationlabs/megapot-ui-kit';
import { base } from 'viem/chains';

// New imports for on-chain reads
import { useIQPoints } from '@/lib/hooks/useIQPoints';
import useTPoints from '@/lib/hooks/useTPoints';

export default function JackpotPage() {
  // Resolve megapot contract info if available (mainnet only)
  const mainnetJackpotContract = JACKPOT[base.id]?.[MainnetJackpotName.USDC];

  const { address } = useAccount();
  const chainId = useChainId();
  const isOnBase = chainId === base.id;

  const { iqPoints } = useIQPoints(address as `0x${string}` | undefined);
  const { tPoints } = useTPoints(address as `0x${string}` | undefined);

  // thresholds (BigInt)
  const REQUIRED_T_POINTS = 100_000n;
  const REQUIRED_IQ = 60n;

  // Eligibility: UNBLURRED only when BOTH thresholds are met (so blurred when EITHER unmet)
  const isEligible = useMemo(() => {
    try {
      const tp = tPoints ?? 0n;
      const iq = iqPoints ?? 0n;
      return tp >= REQUIRED_T_POINTS && iq >= REQUIRED_IQ;
    } catch {
      return false;
    }
  }, [tPoints, iqPoints]);

  // Expose env var value used by hook for debugging
  const triviaPointsEnv = (process.env.NEXT_PUBLIC_TRIVIA_POINTS_ADDRESS ||
                           process.env.NEXT_PUBLIC_TPOINTS_ADDRESS ||
                           '') as string;

  return (
    // full-screen center container
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] p-8">
      {/* card centered and constrained */}
      <div
        className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center bg-white/80 backdrop-blur px-8 py-12 rounded-2xl border border-[#F4A6B7] shadow-lg"
        role="region"
        aria-label="Jackpot section"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] mb-4">Jackpot coming soon.....</h1>
        <div className="mb-4">
          <ConnectControls />
        </div>
        <p className="text-lg sm:text-xl text-[#5a3d5c] mb-6">Only for players with 100,000 T points and 60 iQ.</p>

        {/* Debug overlay (visible while connected) */}
        <div className="w-full max-w-xl mb-4">
          <DebugBox
            address={address}
            chainId={chainId}
            isOnBase={isOnBase}
            iqPoints={iqPoints}
            tPoints={tPoints}
            triviaPointsEnv={triviaPointsEnv}
            isEligible={isEligible}
          />
        </div>

        <div className="w-full mt-6">
          <MegapotWrapper>
            <div className="w-full flex flex-col items-center gap-4">
              {/* Gate around the megapot UI to blur when not eligible */}
              <MegapotGate isEligible={isEligible}>
                {/* Base Mainnet */}
                {mainnetJackpotContract && (
                  <MegapotJackpot contract={mainnetJackpotContract} />
                )}
              </MegapotGate>
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
            {c.name}{!c.ready ? ' (unavailable)' : ''}
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

/**
 * MegapotGate
 * - Applies a blur to the Megapot UI when isEligible === false
 * - Keeps a small overlay showing the jackpot amount (visible even when blurred)
 */
function MegapotGate({ children, isEligible }: { children: React.ReactNode; isEligible: boolean }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [jackpotText, setJackpotText] = useState<string | null>(null);

  // Attempt to read a visible jackpot amount from common selectors inside the Megapot UI.
  useEffect(() => {
    if (!wrapperRef.current) return;

    function updateJackpot() {
      const el = wrapperRef.current!;
      const selectors = [
        '[data-jackpot-amount]',
        '.jackpot-amount',
        '.megapot-jackpot-amount',
        '.jp-amount',
        '.amount',
      ];
      for (const sel of selectors) {
        const found = el.querySelector(sel);
        if (found && found.textContent && found.textContent.trim().length > 0) {
          setJackpotText(found.textContent.trim());
          return;
        }
      }
      const text = el.innerText || '';
      const match = text.match(/\$[\d,]+(?:\.\d+)?/);
      if (match) {
        setJackpotText(match[0]);
      } else {
        setJackpotText(null);
      }
    }

    updateJackpot();

    const obs = new MutationObserver(() => updateJackpot());
    obs.observe(wrapperRef.current, { childList: true, subtree: true, characterData: true });

    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative w-full max-w-3xl" ref={wrapperRef}>
      <div className={`transition-filter duration-300 ${isEligible ? '' : 'filter blur-sm opacity-95 pointer-events-none'}`}>
        {children}
      </div>

      {!isEligible && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded px-3 py-2 text-center shadow">
            <div className="text-sm text-[#5a3d5c]">Jackpot</div>
            <div className="text-2xl font-extrabold text-[#2d1b2e]">
              {jackpotText ?? '$—'}
            </div>
            <div className="text-xs text-[#5a3d5c] mt-1">Reach 100,000 T points and 60 iQ to unlock</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Small debug box component to help diagnose gating issues */
function DebugBox({ address, chainId, isOnBase, iqPoints, tPoints, triviaPointsEnv, isEligible }: {
  address?: `0x${string}` | undefined;
  chainId?: number | undefined;
  isOnBase: boolean;
  iqPoints?: bigint | null;
  tPoints?: bigint | null;
  triviaPointsEnv: string;
  isEligible: boolean;
}) {
  if (!address) {
    return <div className="text-sm text-[#7a516d]">Not connected — connect a wallet to see on-chain values.</div>;
  }

  return (
    <div className="text-left text-xs text-[#5a3d5c] bg-[#fff0f5] border border-[#f4a6b7] rounded p-3">
      <div><strong>Address:</strong> {address}</div>
      <div><strong>ChainId:</strong> {String(chainId)} {isOnBase ? '(Base)' : '(not Base — switch to Base!)'}</div>
      <div><strong>T-points contract env:</strong> {triviaPointsEnv || '<not set>'}</div>
      <div><strong>iQ points (raw):</strong> {iqPoints === null ? 'null' : String(iqPoints)}</div>
      <div><strong>T points (raw):</strong> {tPoints === null ? 'null' : String(tPoints)}</div>
      <div><strong>Eligibility:</strong> {isEligible ? 'UNLOCKED' : 'LOCKED'}</div>
      <div className="mt-2 text-xs text-[#884060]">If T-points or iQ show null/0, check env var, contract ABI, and ensure wallet is on Base chain.</div>
    </div>
  );
}
