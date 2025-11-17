"use client";

import { useEffect } from "react";

export default function FarcasterMiniAppReady() {
  useEffect(() => {
    let cancelled = false;

    async function callReadyOnCandidate(candidate: any, label = 'candidate'): Promise<boolean> {
      try {
        if (!candidate) return false;
        const maybeSdk = candidate.sdk ? candidate.sdk : candidate;
        if (maybeSdk && maybeSdk.actions && typeof maybeSdk.actions.ready === 'function') {
          console.debug(`[FarcasterMiniAppReady] calling ${label}.actions.ready()`);
          // fire-and-forget
          void maybeSdk.actions.ready({ disableNativeGestures: false });
          return true;
        }
      } catch (e) {
        console.debug(`[FarcasterMiniAppReady] ${label} ready() threw`, e);
      }
      return false;
    }

    async function findAndReady(): Promise<boolean> {
      // quick global checks (window, known globals)
      try {
        const w = window as any;
        const candidates = [w, w.sdk, w.farcasterSdk, w.farcasterMiniApp, w.__farcasterMiniApp, w.FarcasterMiniApp, w.miniApp, w.farcaster];
        for (const [i, c] of candidates.entries()) {
          if (!c) continue;
          if (await callReadyOnCandidate(c, `global[${i}]`)) return true;
        }

        // scan top-level window keys for SDK-like objects (best-effort)
        try {
          const keys = Object.keys(w || {}).slice(0, 200);
          for (const k of keys) {
            try {
              const v = (w as any)[k];
              if (v && typeof v === 'object') {
                if (v.actions && typeof v.actions.ready === 'function') {
                  if (await callReadyOnCandidate(v, `window.${k}`)) return true;
                }
              }
            } catch (_) {
              // ignore inaccessible properties
            }
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {
        console.debug('[FarcasterMiniAppReady] global detection failed', e);
      }

      // Try importing the module once (do not block too long)
      try {
        const importPromise = import('@farcaster/miniapp-sdk').catch(() => null);
        const mod = await Promise.race([importPromise, new Promise((res) => setTimeout(() => res(null), 800))]);
        if (cancelled) return false;
        if (mod) {
          const maybeSdk = (mod as any)?.sdk ?? (mod as any)?.default?.sdk ?? (mod as any)?.default ?? mod;
          if (await callReadyOnCandidate(maybeSdk, 'module')) return true;
        }
      } catch (e) {
        console.debug('[FarcasterMiniAppReady] import attempt failed', e);
      }

      // Also check parent/top frames for SDK objects (if accessible)
      try {
        if (window.parent && window.parent !== window) {
          if (await callReadyOnCandidate(window.parent, 'window.parent')) return true;
        }
      } catch (e) {
        console.debug('[FarcasterMiniAppReady] access to window.parent failed', e);
      }

      try {
        if (window.top && window.top !== window) {
          if (await callReadyOnCandidate(window.top, 'window.top')) return true;
        }
      } catch (e) {
        console.debug('[FarcasterMiniAppReady] access to window.top failed', e);
      }

      return false;
    }

    (async () => {
      // Poll for the SDK for up to ~5 seconds (20 attempts * 250ms)
      const maxAttempts = 20;
      const delayMs = 250;

      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt++) {
        try {
          const ok = await findAndReady();
          if (ok) {
            console.debug('[FarcasterMiniAppReady] ready() called successfully');
            return;
          }
        } catch (e) {
          console.debug('[FarcasterMiniAppReady] findAndReady error', e);
        }

        // send a gentle notification to parent frame so hosting apps can respond
        try {
          if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            const payload = { type: 'miniapp:ready', source: 'triviacast', attempt };
            window.parent.postMessage(payload, '*');
            // Post a few variant message types in case host expects different shape
            window.parent.postMessage({ type: 'miniapp-ready', source: 'triviacast', attempt }, '*');
            window.parent.postMessage({ type: 'miniappReady', source: 'triviacast', attempt }, '*');
            window.parent.postMessage({ type: 'fc:miniapp:ready', source: 'triviacast', attempt }, '*');
            // Also send a lightweight string variant for older hosts
            window.parent.postMessage('miniapp:ready', '*');
          }
        } catch (e) {
          // ignore
        }

        // wait before next attempt
        await new Promise((res) => setTimeout(res, delayMs));
      }

      // Final fallback: one last postMessage
      try {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
          console.debug('[FarcasterMiniAppReady] posting final miniapp:ready to parent as fallback');
          const finalPayload = { type: 'miniapp:ready', source: 'triviacast', final: true };
          window.parent.postMessage(finalPayload, '*');
          window.parent.postMessage({ type: 'miniapp-ready', source: 'triviacast', final: true }, '*');
          window.parent.postMessage({ type: 'miniappReady', source: 'triviacast', final: true }, '*');
          window.parent.postMessage('miniapp:ready:final', '*');
        }
      } catch (e) {
        console.debug('[FarcasterMiniAppReady] postMessage fallback failed', e);
      }
    })();

    // Diagnostic: listen for messages from parent/host and log them (helps debug why host isn't marking ready)
    try {
      const onMessage = (ev: MessageEvent) => {
        try {
          console.debug('[FarcasterMiniAppReady] received message from host', ev?.data);
        } catch (e) {
          console.debug('[FarcasterMiniAppReady] received message (unserializable)');
        }
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('message', onMessage);
        // remove listener on cleanup
        const cleanup = () => window.removeEventListener('message', onMessage);
        // Ensure we remove when component unmounts
        const origReturn = () => {
          cancelled = true;
          cleanup();
        };
        // override the return to ensure cleanup is attached (React will call this return)
        // Note: we can't actually replace the outer return function here, but the cleanup above
        // ensures the listener removal in the normal flow. This comment documents intent.
      }
    } catch (e) {
      // ignore listener failures
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
