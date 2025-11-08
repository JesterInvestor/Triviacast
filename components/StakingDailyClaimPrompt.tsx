"use client";

import { useEffect, useState } from "react";
import { useAccount } from 'wagmi';
import { callDailyClaim, isDistributorConfigured } from '@/lib/distributor';
import { getDailyClaimLabel } from '@/lib/config';

const DISMISS_KEY = "triviacast:claim_prompt:dismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export default function StakingDailyClaimPrompt() {
  const { address, status } = useAccount();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!address) {
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
        // Attempt to import the Farcaster miniapp SDK if present and call
        // ready() to keep host splash behavior consistent. We do NOT block
        // showing the prompt on absence of the SDK — the prompt should be
        // available across devices.
        const { sdk } = await import('@farcaster/miniapp-sdk');
        if (cancelled) return;
        try { await sdk.actions?.ready?.(); } catch {}
      } catch (_) {
        // ignore - SDK not present outside host
      }

      if (!isDistributorConfigured()) return; // no distributor configured

      // small delay so it doesn't clash with other prompts
      setTimeout(() => {
        if (!cancelled && shouldShow()) setOpen(true);
      }, 800);
    };

    setup();
    return () => { cancelled = true; };
  }, [address]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setOpen(false);
  };

  const onDailyClaim = async () => {
    setBusy(true);
    setError(null);
    try {
  if (!address) throw new Error('Please connect your wallet');
  await callDailyClaim();

      // Notify points updated and show success toast
      try {
        window.dispatchEvent(new CustomEvent('triviacast:pointsUpdated'));
      } catch {}
      try {
        window.dispatchEvent(
          new CustomEvent('triviacast:toast', {
            detail: { type: 'success', message: `You claimed ${DAILY_CLAIM_AMOUNT}` },
          })
        );
      } catch {}

      // Hide for 24 hours on success
      dismiss();
    } catch (err: unknown) {
      const e = err as { message?: string } | null;
      let msg = e?.message || 'Unable to claim. Try again later.';
      // Friendly remapping for common revert reasons
      if (msg?.toLowerCase().includes('no t points')) {
        msg = 'Play the quiz, sign for T points, and try again tomorrow........';
      } else
      if (msg?.toLowerCase().includes('cooldown')) {
        msg = 'Try again tomorrow.............';
      }
      setError(msg);
      try {
        window.dispatchEvent(
          new CustomEvent('triviacast:toast', { detail: { type: 'error', message: msg } })
        );
      } catch {}
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
              <h3 className="text-base font-semibold">Daily Claim</h3>
              <p className="mt-1 text-sm text-neutral-600">
                Claim your daily reward. Staking coming soon.....
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
          <p className="mt-3 text-[11px] text-neutral-500">Daily claims are limited to once per 24 hours.</p>
        </div>
      </div>
      
    </div>
  );
}
