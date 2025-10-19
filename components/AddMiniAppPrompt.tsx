"use client";

import { useEffect, useState } from "react";
import Image from 'next/image';


const DISMISS_KEY = "triviacast:add_prompt:dismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export default function AddMiniAppPrompt() {
  // The Neynar SDK is optional at build time. Dynamically load it at runtime
  // so that builds don't fail in environments where the package isn't installed.
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  type AddMiniAppResult = { added?: boolean; reason?: string };
  const [addMiniAppFn, setAddMiniAppFn] = useState<(() => Promise<AddMiniAppResult>) | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Try to dynamically import the Neynar React helper. If it's not present,
    // we keep `isSDKLoaded` false and avoid showing the prompt.
    (async () => {
      try {
  // Use an eval-backed dynamic import so bundlers don't attempt to resolve
  // the optional package at build-time (some hosts don't install it).
  const mod = await (eval('import("@neynar/react")') as Promise<unknown>);
    if (mod && typeof (mod as any).useMiniApp === 'function') {
          // We don't call the hook directly (can't call hooks conditionally). Instead
          // we create a thin runtime wrapper that proxies to the module's functions.
          setIsSDKLoaded(true);
          setAddMiniAppFn(() => async () => {
            // Re-import inside function to ensure fresh access to the hook implementation
            // Use eval import to avoid static bundler resolution
            const m = await (eval('import("@neynar/react")') as Promise<unknown>);
            try {
              const mAny = m as any;
              // Some implementations export an `addMiniApp` helper. Use it if present.
              if (mAny && typeof mAny.addMiniApp === 'function') {
                return await mAny.addMiniApp();
              }
            } catch (e) {
              // ignore and fallback
            }
            // Fallback to a global Neynar helper if host exposes it
            const globalAny = (window as unknown) as Record<string, any>;
            if (globalAny?.neynar?.addMiniApp) {
              return await globalAny.neynar.addMiniApp();
            }
            // If we can't locate an add function, throw so callers show a friendly error.
            throw new Error('addMiniApp not available');
          });
        }
      } catch {
        // Not available — keep defaults
      }
    })();

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

    // Wait for Neynar SDK to load and only show prompt if loaded and allowed
    const setup = async () => {
      try {
        if (!isSDKLoaded) return;
        // Small delay to avoid racing with splash dismiss and first paint
        setTimeout(() => {
          if (!cancelled && shouldShow()) setOpen(true);
        }, 1200);
      } catch {
        // ignore — non-host environments
      }
    };

    setup();
    return () => {
      cancelled = true;
    };
  }, [isSDKLoaded]);

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
      if (!addMiniAppFn) throw new Error('Add action not available');
      const result = await addMiniAppFn();
      if (result.added) {
        // Success: don’t nag again
        dismiss();
      } else {
        if (result.reason === 'invalid_domain_manifest') {
          setError('This site cannot be added from this domain.');
        } else if (result.reason === 'rejected_by_user') {
          setError('You rejected the add prompt.');
        } else {
          setError('Unable to add app.');
        }
        setBusy(false);
      }
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
