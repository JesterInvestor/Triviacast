"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

// New imports
import { useIQPoints } from '@/lib/hooks/useIQPoints';
import useTPoints from '@/lib/hooks/useTPoints';

export default function JackpotPage() {
  const { address } = useAccount();
  const { iqPoints } = useIQPoints(address as `0x${string}` | undefined);
  const { tPoints } = useTPoints(address as `0x${string}` | undefined);

  // thresholds (as BigInt for comparison)
  const REQUIRED_T_POINTS = 100_000n;
  const REQUIRED_IQ = 60n;

  // Determine gating - require BOTH thresholds to be met to remove blur.
  const isEligible = useMemo(() => {
    try {
      const tp = tPoints ?? 0n;
      const iq = iqPoints ?? 0n;
      return tp >= REQUIRED_T_POINTS && iq >= REQUIRED_IQ;
    } catch {
      return false;
    }
  }, [tPoints, iqPoints]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#FFF6F9] to-[#FFEAF1] py-6 sm:py-10">
      <div className="max-w-3xl mx-auto px-3 sm:px-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] text-center">Jackpot</h1>
          <p className="text-lg sm:text-xl text-[#5a3d5c] mb-6">Only for players with 100,000 T points and 60 iQ.</p>
        </div>

        <div className="w-full mt-6">
          <MegapotWrapper>
            <div className="w-full flex flex-col items-center gap-4">
              {/*
                Wrap the Megapot area with a relative container so we can:
                  - blur the megapot UI when not eligible
                  - display a small overlay showing the jackpot amount (visible even when blurred)
              */}
              <MegapotGate isEligible={isEligible}>
                {/* Base Mainnet */}
                <MegapotJackpot contract={MainnetJackpotName as any} />
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
  /* existing connect controls (unchanged) */
  return <WagmiWalletConnect />;
}

function MegapotWrapper({ children }: { children: React.ReactNode }) {
  const { connectors } = useConnect();

  return (
    <MegapotProvider
      onConnectWallet={() => {
        try {
          connectors[0]?.connect();
        } catch (e) { /* ignore */ }
      }}
    >
      {children}
    </MegapotProvider>
  );
}

/**
 * MegapotGate
 * - Applies a blur to the Megapot UI when isEligible === false
 * - Keeps a small overlay visible that shows the jackpot amount (reads from Megapot DOM if available).
 */
function MegapotGate({ children, isEligible }: { children: React.ReactNode; isEligible: boolean }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [jackpotText, setJackpotText] = useState<string | null>(null);

  // Attempt to read a visible jackpot amount from common selectors inside the Megapot UI.
  useEffect(() => {
    if (!wrapperRef.current) return;

    function updateJackpot() {
      const el = wrapperRef.current!;
      // Try a few common selectors a third-party UI might use (data attributes or classname)
      const selectors = [
        '[data-jackpot-amount]',
        '.jackpot-amount',
        '.megapot-jackpot-amount',
        '.jp-amount',
        '.amount', // fallback; riskier
      ];
      for (const sel of selectors) {
        const found = el.querySelector(sel);
        if (found && found.textContent && found.textContent.trim().length > 0) {
          setJackpotText(found.textContent.trim());
          return;
        }
      }
      // If not found, try to pick any numeric-looking text inside the wrapper as fallback
      const text = el.innerText || '';
      const match = text.match(/\$[\d,]+(?:\.\d+)?/);
      if (match) {
        setJackpotText(match[0]);
      } else {
        setJackpotText(null);
      }
    }

    // initial attempt
    updateJackpot();

    // Observe changes to the subtree (jackpot value might update asynchronously)
    const obs = new MutationObserver(() => updateJackpot());
    obs.observe(wrapperRef.current, { childList: true, subtree: true, characterData: true });

    return () => obs.disconnect();
  }, []);

  return (
    <div className="relative w-full max-w-3xl" ref={wrapperRef}>
      {/* the content itself; will be blurred via CSS when not eligible */}
      <div className={`transition-filter duration-300 ${isEligible ? '' : 'filter blur-sm opacity-95 pointer-events-none'}`}>
        {children}
      </div>

      {/* overlay that remains visible when gated: shows jackpot amount and a short note */}
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
