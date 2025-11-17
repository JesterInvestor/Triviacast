"use client";

import { useEffect } from "react";

export default function FarcasterMiniAppReady() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maxAttempts = 40; // increase attempts to handle hosts that inject SDK later
      const delayMs = 250;

      async function tryReadyFromSdkModule() {
        try {
          const mod = await import('@farcaster/miniapp-sdk');
          const maybeSdk = (mod as any)?.sdk || (mod as any)?.default?.sdk || (mod as any)?.default || (mod as any);
          if (maybeSdk && maybeSdk.actions && typeof maybeSdk.actions.ready === 'function') {
            console.debug('[FarcasterMiniAppReady] calling sdk.actions.ready() (from module import)');
            // await the module-ready when we can
            await maybeSdk.actions.ready({ disableNativeGestures: false });
            return true;
          }
        } catch (err) {
          // fall through to other attempts
          console.debug('[FarcasterMiniAppReady] import sdk failed', err);
        }
        return false;
      }

      function callReadyIfPresent(obj: any, label = 'global'): boolean {
        try {
          if (!obj) return false;
          const maybeSdk = obj.sdk ? obj.sdk : obj;
          if (maybeSdk && maybeSdk.actions && typeof maybeSdk.actions.ready === 'function') {
            try {
              console.debug(`[FarcasterMiniAppReady] calling ${label} ready()`);
              // Call without awaiting when coming from host globals to avoid blocking
              void maybeSdk.actions.ready({ disableNativeGestures: false });
              return true;
            } catch (e) {
              console.debug(`[FarcasterMiniAppReady] ${label} ready() threw`, e);
            }
          }
        } catch (e) {
          console.debug(`[FarcasterMiniAppReady] calling ${label} failed`, e);
        }
        return false;
      }

      function tryReadyFromGlobal(): boolean {
        try {
          const w = window as any;
          // Common global names hosts might use (expanded)
          const candidates = [w, w.sdk, w.farcasterSdk, w.farcasterMiniApp, w.__farcasterMiniApp, w.FarcasterMiniApp, (w as any).farcaster, (w as any).miniApp];
          // Try top-level objects first (window, window.parent, window.top)
          if (callReadyIfPresent(w, 'window')) return true;
          try {
            if (window.parent && callReadyIfPresent(window.parent, 'window.parent')) return true;
          } catch (e) {
            console.debug('[FarcasterMiniAppReady] access to window.parent failed', e);
          }
          try {
            if (window.top && callReadyIfPresent(window.top, 'window.top')) return true;
          } catch (e) {
            console.debug('[FarcasterMiniAppReady] access to window.top failed', e);
          }

          for (const c of candidates) {
            if (!c) continue;
            if (callReadyIfPresent(c, 'candidate')) return true;
          }

          // If we didn't find an expected global, scan window keys for anything that looks like the SDK.
          try {
            const found: string[] = [];
            const props = Object.keys(w);
            for (let i = 0; i < props.length; i++) {
              const k = props[i];
              try {
                const val = (w as any)[k];
                if (val && typeof val === 'object' && val.actions && typeof val.actions.ready === 'function') {
                  found.push(k as string);
                  try {
                    console.debug(`[FarcasterMiniAppReady] calling discovered global ${k}.actions.ready()`);
                    void val.actions.ready({ disableNativeGestures: false });
                    return true;
                  } catch (e) {
                    console.debug(`[FarcasterMiniAppReady] discovered ${k}.actions.ready threw`, e);
                  }
                }
              } catch (e) {
                // ignore inaccessible props
              }
              if (found.length >= 5) break; // don't scan entire huge window object
            }
            if (found.length > 0) {
              console.debug('[FarcasterMiniAppReady] discovered SDK-like globals:', found.slice(0, 5));
            }
          } catch (e) {
            console.debug('[FarcasterMiniAppReady] window scan failed', e);
          }
        } catch (err) {
          console.debug('[FarcasterMiniAppReady] global detection failed', err);
        }
        return false;
      }

      for (let attempt = 1; attempt <= maxAttempts && !cancelled; attempt++) {
        // 1) Try the SDK module import path
        const done = await tryReadyFromSdkModule();
        if (done) break;

        // 2) Try any host-injected global sdk
        const ok = tryReadyFromGlobal();
        if (ok) break;

        // 3) wait and retry
        await new Promise((res) => setTimeout(res, delayMs));
      }

      // If we reached here without success, attempt a generic postMessage to parent window (in case host listens for this)
      try {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
          console.debug('[FarcasterMiniAppReady] posting ready message to parent window as fallback');
          window.parent.postMessage({ type: 'miniapp:ready', source: 'triviacast' }, '*');
        }
      } catch (e) {
        console.debug('[FarcasterMiniAppReady] postMessage fallback failed', e);
      }
    })();

    // Cleanup: signal cancellation so retries stop when component unmounts
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
