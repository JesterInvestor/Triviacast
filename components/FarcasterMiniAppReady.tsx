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
    })();

    // Cleanup: signal cancellation so retries stop when component unmounts
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
