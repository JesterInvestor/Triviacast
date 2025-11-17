"use client";

import { useEffect } from "react";

export default function FarcasterMiniAppReady() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maxAttempts = 10;
      const delayMs = 500;

      async function tryReadyFromSdkModule() {
        try {
          const mod = await import('@farcaster/miniapp-sdk');
          const { sdk } = mod as any;
          if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
            console.debug('[FarcasterMiniAppReady] calling sdk.actions.ready()');
            await sdk.actions.ready({ disableNativeGestures: false });
            return true;
          }
        } catch (err) {
          // fall through to other attempts
          console.debug('[FarcasterMiniAppReady] import sdk failed', err);
        }
        return false;
      }

      function tryReadyFromGlobal(): boolean {
        try {
          const w = window as any;
          const candidates = [w.sdk, w.farcasterSdk, w.farcasterMiniApp, w.__farcasterMiniApp, w.FarcasterMiniApp];
          for (const c of candidates) {
            if (!c) continue;
            const maybeSdk = c.sdk ? c.sdk : c;
            if (maybeSdk && maybeSdk.actions && typeof maybeSdk.actions.ready === 'function') {
              try {
                console.debug('[FarcasterMiniAppReady] calling global sdk.actions.ready()');
                // call but don't await here (some hosts expect sync)
                void maybeSdk.actions.ready({ disableNativeGestures: false });
                return true;
              } catch (e) {
                console.debug('[FarcasterMiniAppReady] global ready() threw', e);
              }
            }
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
                  // Attempt to call it once we find it
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
              if (found.length >= 3) break; // don't scan entire huge window object
            }
            if (found.length > 0) {
              console.debug('[FarcasterMiniAppReady] discovered SDK-like globals:', found.slice(0, 3));
            }
          } catch (e) {
            // ignore scanning errors
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
