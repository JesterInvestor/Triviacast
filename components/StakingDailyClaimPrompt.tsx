"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from 'thirdweb/react';
import { callDailyClaim, isDistributorConfigured } from '@/lib/distributor';
import { getDailyClaimLabel } from '@/lib/config';

const DISMISS_KEY = "triviacast:claim_prompt:dismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export default function StakingDailyClaimPrompt() {
  const account = useActiveAccount();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!account) {
      setOpen(false);
      return;
    }

    const shouldShow = () => {
      try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return true;
        const ts = Number(raw);
        return !Number.isFinite(ts) || Date.now() - ts > DISMISS_TTL_MS;
      } catch {
        return true;
      }
    };

    const setup = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        if (cancelled) return;
        if (!(await sdk.isInMiniApp())) return; // only in Farcaster hosts
        if (!isDistributorConfigured()) return; // no distributor configured

        // small delay so it doesn't clash with other prompts
        setTimeout(() => {
          if (!cancelled && shouldShow()) setOpen(true);
        }, 800);
      } catch (e) {
        // ignore - SDK not present outside host
      }
    };

    setup();
    return () => { cancelled = true; };
  }, [account]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setOpen(false);
  };

  const onDailyClaim = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!account) throw new Error('Please connect your wallet');
      await callDailyClaim(account as any);
      // notify points updated and show success toast
      try { window.dispatchEvent(new CustomEvent('triviacast:pointsUpdated')); } catch {}
  try { window.dispatchEvent(new CustomEvent('triviacast:toast', { detail: { type: 'success', message: `You claimed ${DAILY_CLAIM_AMOUNT}` } })); } catch {}
      // hide for 24 hours on success
      dismiss();
    } catch (e: any) {
      const msg = e?.message || 'Unable to claim. Try again later.';
      setError(msg);
      try { window.dispatchEvent(new CustomEvent('triviacast:toast', { detail: { type: 'error', message: msg } })); } catch {}
      setBusy(false);
    }
  };

  const DAILY_CLAIM_AMOUNT = getDailyClaimLabel();


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white text-neutral-900 shadow-xl ring-1 ring-black/5">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <img src="/icon.png" alt="App icon" className="h-10 w-10 rounded" />
            <div className="flex-1">
              <h3 className="text-base font-semibold">Daily Claim & Staking</h3>
              <p className="mt-1 text-sm text-neutral-600">
                Claim your daily reward or go to staking to boost rewards.
              </p>
            </div>
            <button aria-label="Close" onClick={dismiss} className="-m-1 rounded p-1 text-neutral-500 hover:text-neutral-900">×</button>
          </div>
          {error && (<p className="mt-3 text-sm text-red-600">{error}</p>)}
          {DAILY_CLAIM_AMOUNT && (
            <p className="mt-3 text-sm text-neutral-600">Daily claim amount: <strong>{DAILY_CLAIM_AMOUNT}</strong></p>
          )}
          <div className="mt-4">
            <div className="mt-3 flex items-center gap-3">
              <button onClick={onDailyClaim} disabled={busy} className="inline-flex items-center justify-center rounded-lg bg-[#6C47FF] px-4 py-2 text-white text-sm font-medium disabled:opacity-60">
                {busy ? 'Processing…' : 'Claim Daily'}
              </button>
              <button onClick={dismiss} disabled={busy} className="text-sm text-neutral-600 hover:text-neutral-900">
                Not now
              </button>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-neutral-500">Daily claims are limited to once per 24 hours. Staking is available on the web staking page.</p>
        </div>
      </div>
      
    </div>
  );
}
