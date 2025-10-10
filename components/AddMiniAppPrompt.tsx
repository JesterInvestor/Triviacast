"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "triviacast:add_prompt:dismissedAt";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export default function AddMiniAppPrompt() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

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
        const { sdk } = await import("@farcaster/miniapp-sdk");
        if (cancelled) return;
        if (!(await sdk.isInMiniApp())) return; // Only show in Farcaster hosts

        // Small delay to avoid racing with splash dismiss and first paint
        setTimeout(() => {
          if (!cancelled && shouldShow()) setOpen(true);
        }, 1200);
      } catch {
        // ignore if SDK not available on non-host environments
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
      const { sdk } = await import("@farcaster/miniapp-sdk");
      await sdk.actions.addMiniApp();
      // Success: don’t nag again
      dismiss();
    } catch (e: any) {
      const msg = (e?.message as string) || "Unable to add app. Try again later.";
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
            <img src="/icon.png" alt="App icon" className="h-10 w-10 rounded" />
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
