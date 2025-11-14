"use client";

import React, { useEffect, useMemo, useState } from "react";
import WagmiWalletConnect from '@/components/WagmiWalletConnect';
import { useAccount } from 'wagmi';
import { callStake, parseTokenAmount, getStakedBalance, isStakingConfigured } from '@/lib/staking';

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function JackpotPage() {
  // Fixed target: Nov 22, 2025 at 00:00 (midnight) in the user's local timezone.
  // If you prefer UTC midnight, replace with: Date.UTC(2025, 10, 22, 0, 0, 0)
  const target = useMemo(() => new Date("2025-11-22T00:00:00").getTime(), []);

  const [remainingMs, setRemainingMs] = useState(Math.max(0, target - Date.now()));
  const { address } = useAccount();
  const [stakedAmount, setStakedAmount] = useState<bigint>(BigInt(0));
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const STAKE_THRESHOLD = parseTokenAmount('100000');

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!address) {
        setStakedAmount(BigInt(0));
        return;
      }
      try {
        const bal = await getStakedBalance(address);
        if (mounted) setStakedAmount(bal);
      } catch (e) {
        console.warn('failed to read staked balance', e);
      }
    }
    load();
    return () => { mounted = false; };
  }, [address]);

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
        <p className="text-lg sm:text-xl text-[#5a3d5c] mb-6">Only for players with 100,000 T points and 70 iQ.</p>

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

          {/* Staking section */}
          <div className="w-full mt-4 bg-white/60 rounded-lg border border-[#f4c0cc] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-[#6b4460]">Jackpot access</div>
                <div className="text-xs text-[#7a516d]">Stake 100,000 $TRIV to unlock a spin</div>
              </div>
              <div>
                <WagmiWalletConnect />
              </div>
            </div>

            {!isStakingConfigured() ? (
              <div className="text-sm text-yellow-700">Staking is not configured on this build.</div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-[#5a3d5c]">
                  Your staked: <strong>{formatHuman(stakedAmount)}</strong>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg disabled:opacity-60"
                    disabled={!address || loading}
                    onClick={async () => {
                      if (!address) return;
                      setLoading(true);
                      setTxHash(null);
                      try {
                        const amt = STAKE_THRESHOLD;
                        const hash = await callStake(amt);
                        setTxHash(hash as string);
                        // refresh balance
                        const bal = await getStakedBalance(address);
                        setStakedAmount(bal);
                      } catch (e: any) {
                        console.error('stake failed', e);
                        window.dispatchEvent(new CustomEvent('triviacast:toast', { detail: { type: 'error', message: e?.message || String(e) } }));
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? 'Staking…' : 'Stake 100,000 $TRIV'}
                  </button>

                  <button
                    className="px-4 py-2 bg-rose-600 text-white rounded-lg disabled:opacity-60"
                    disabled={stakedAmount < STAKE_THRESHOLD}
                    onClick={() => {
                      if (stakedAmount >= STAKE_THRESHOLD) {
                        window.dispatchEvent(new CustomEvent('triviacast:toast', { detail: { type: 'success', message: 'You unlocked a spin! (spin implementation pending)' } }));
                      }
                    }}
                  >
                    {stakedAmount >= STAKE_THRESHOLD ? 'Spin for Jackpot' : 'Locked'}
                  </button>
                </div>
              </div>
            )}

            {txHash && (
              <div className="mt-3 text-xs text-[#3b3]">Staking tx: <a target="_blank" rel="noreferrer" href={`https://etherscan.io/tx/${txHash}`}>{short(txHash)}</a></div>
            )}
          </div>
        </div>

        <div aria-live="polite" className="sr-only">
          {finished
            ? "Jackpot is live"
            : `Time remaining: ${days} days, ${pad(hoursTotal)} hours, ${pad(minutes)} minutes, ${pad(seconds)} seconds`}
        </div>
      </div>
    </main>
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

function formatHuman(amount: bigint, decimals = 18) {
  try {
    const s = amount.toString();
    const neg = s.startsWith('-');
    const raw = neg ? s.slice(1) : s;
    if (raw === '0') return '0';
    const pad = raw.padStart(decimals + 1, '0');
    const intPart = pad.slice(0, -decimals);
    let fracPart = pad.slice(-decimals).replace(/0+$/, '');
    const out = fracPart ? `${intPart}.${fracPart}` : intPart;
    return (neg ? '-' : '') + out;
  } catch (e) {
    return '0';
  }
}

function short(s: string | null) {
  if (!s) return '';
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}