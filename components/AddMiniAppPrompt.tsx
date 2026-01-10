"use client";

import { useEffect, useState } from "react";
import Image from 'next/image';


const DISMISS_KEY = "triviacast:add_prompt:dismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// Key to track if user has successfully added the miniapp
const ADDED_KEY = "triviacast:miniapp:added";

export default function AddMiniAppPrompt() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hasAdded = () => {
      try {
        return localStorage.getItem(ADDED_KEY) === "true";
      } catch {
        return false;
      }
    };

    const shouldShow = () => {
      // Don't show if already added
      if (hasAdded()) return false;
      
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
        // Check if we're in a Farcaster context
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          const context = await sdk.context;
          // If we have context, we're in Farcaster - show prompt if conditions met
          if (context && !cancelled && shouldShow()) {
            // Small delay to avoid racing with other prompts
            setTimeout(() => {
              if (!cancelled) setOpen(true);
            }, 1500);
          }
        } catch {
          // Not in Farcaster context, don't show
        }
      } catch {
        // ignore errors
      }
    };

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  };

  const onAdd = async () => {
    setBusy(true);
    setError(null);
    try {
      // Try to use the Farcaster SDK addMiniApp action if available
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        if (sdk?.actions?.addMiniApp) {
          const result = await sdk.actions.addMiniApp();
          if (result) {
            // Mark as successfully added
            try {
              localStorage.setItem(ADDED_KEY, "true");
            } catch {}
            dismiss();
            return;
          }
        }
      } catch (sdkErr) {
        console.error('SDK addMiniApp error:', sdkErr);
      }

      // Fallback: Try Neynar helper
      try {
        const mod = await import('@neynar/react');
        const neynarAny = mod as any;
        if (neynarAny?.addMiniApp) {
          const result = await neynarAny.addMiniApp();
          if (result?.added) {
            // Mark as successfully added
            try {
              localStorage.setItem(ADDED_KEY, "true");
            } catch {}
            dismiss();
            return;
          } else if (result?.reason === 'invalid_domain_manifest') {
            setError('This site cannot be added from this domain.');
          } else if (result?.reason === 'rejected_by_user') {
            setError('You rejected the add prompt.');
          } else {
            setError('Unable to add app.');
          }
        }
      } catch (neynarErr) {
        console.error('Neynar addMiniApp error:', neynarErr);
      }

      // If we got here, nothing worked
      setError('Add to Mini Apps is not available. Make sure you are using Warpcast or another compatible Farcaster client.');
      setBusy(false);
    } catch (err: unknown) {
      const e = err as { message?: string } | null;
      const msg = e?.message || "Unable to add app. Try again later.";
      setError(msg);
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white text-neutral-900 shadow-xl ring-1 ring-black/5">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <Image src="/icon.png" alt="App icon" width={40} height={40} className="rounded" />
            <div className="flex-1">
              <h3 className="text-base font-semibold">Add Triviacast to Mini Apps</h3>
              <p className="mt-1 text-sm text-neutral-600">
                Quickly launch from your Mini Apps list and get optional notifications.
              </p>
            </div>
            <button
              aria-label="Close"
              onClick={dismiss}
              className="-m-1 rounded p-1 text-neutral-500 hover:text-neutral-900"
            >
              ×
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={onAdd}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-lg bg-[#6C47FF] px-4 py-2 text-white text-sm font-medium disabled:opacity-60"
            >
              {busy ? "Adding…" : "Add to Mini Apps"}
            </button>
            <button
              onClick={dismiss}
              disabled={busy}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              Not now
            </button>
          </div>
          <p className="mt-3 text-[11px] text-neutral-500">
            Works on production domains inside Farcaster clients. You can change this anytime in your client settings.
          </p>
        </div>
      </div>
    </div>
  );
}
