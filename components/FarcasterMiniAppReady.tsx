"use client";

import { useEffect } from "react";

export default function FarcasterMiniAppReady() {
  useEffect(() => {
    let cancelled = false;

    async function tryReadyOnce(): Promise<boolean> {
      // 1) Quick check known globals
      try {
        const w = window as any;
        const candidates = [w.sdk, w.farcasterSdk, w.farcasterMiniApp, w.__farcasterMiniApp, w.FarcasterMiniApp, w];
        for (const c of candidates) {
          if (!c) continue;
          try {
            const maybeSdk = c.sdk ? c.sdk : c;
            if (maybeSdk && maybeSdk.actions && typeof maybeSdk.actions.ready === 'function') {
              console.debug('[FarcasterMiniAppReady] calling ready() from global');
              void maybeSdk.actions.ready({ disableNativeGestures: false });
              return true;
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.debug('[FarcasterMiniAppReady] global check failed', e);
      }

      // 2) Try importing SDK but don't wait long
      try {
        const importPromise = import('@farcaster/miniapp-sdk').catch(() => null);
        const mod = await Promise.race([importPromise, new Promise((res) => setTimeout(() => res(null), 800))]);
        if (cancelled) return false;
        if (mod) {
          const maybeSdk = (mod as any)?.sdk ?? (mod as any)?.default?.sdk ?? (mod as any)?.default ?? mod;
          if (maybeSdk && maybeSdk.actions && typeof maybeSdk.actions.ready === 'function') {
            console.debug('[FarcasterMiniAppReady] calling ready() from module');
            void maybeSdk.actions.ready({ disableNativeGestures: false });
            return true;
          }
        }
      } catch (e) {
        console.debug('[FarcasterMiniAppReady] import attempt failed', e);
      }

      return false;
    }

    (async () => {
      // Run once, quick retry, then fallback to postMessage
      let ok = await tryReadyOnce();
      if (!ok && !cancelled) {
        await new Promise((res) => setTimeout(res, 300));
        ok = await tryReadyOnce();
      }

      if (!ok && !cancelled) {
        try {
          if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            console.debug('[FarcasterMiniAppReady] posting miniapp:ready to parent as fallback');
            window.parent.postMessage({ type: 'miniapp:ready', source: 'triviacast' }, '*');
          }
        } catch (e) {
          console.debug('[FarcasterMiniAppReady] postMessage fallback failed', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
