"use client";

import { useEffect } from "react";

// We dynamically import the SDK client-side to avoid SSR issues
export default function FarcasterMiniAppReady() {
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const callReady = async () => {
      try {
        const mod = await import("@farcaster/miniapp-sdk");
        if (cancelled) return;

        // Avoid calling outside Mini App hosts (e.g., normal browser) and prevent double calls
        const { sdk } = mod as typeof import("@farcaster/miniapp-sdk");
        if (!(await sdk.isInMiniApp())) {
          // Not in a Mini App environment; do nothing
          return;
        }

        if ((window as any).__TRIVIACAST_READY_CALLED) {
          return; // already signaled ready
        }

        // Use rAF to avoid calling before first paint to reduce jitter/reflow
        await new Promise((res) => requestAnimationFrame(() => res(undefined)));

        await sdk.actions.ready();
        try {
          (window as any).__TRIVIACAST_READY_CALLED = true;
        } catch {}
        // Once successful, we can stop listening
        document.removeEventListener("visibilitychange", onVisible);
      } catch (err) {
        // Retry a few times in case host isn't ready yet
        attempts += 1;
        if (attempts <= 3) {
          setTimeout(callReady, 300 * attempts);
        } else {
          console.debug("Farcaster ready() not acknowledged; will retry on visibilitychange.");
        }
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        callReady();
      }
    };

    // Ensure DOM is ready before calling
    if (document.readyState === "complete" || document.readyState === "interactive") {
      callReady();
    } else {
      window.addEventListener("DOMContentLoaded", callReady, { once: true });
    }

    // Also listen for visibility changes (some hosts delay until visible)
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("DOMContentLoaded", callReady as any);
    };
  }, []);

  return null;
}
