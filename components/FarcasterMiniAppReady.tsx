"use client";

import { useEffect } from "react";

// We dynamically import the SDK client-side to avoid SSR issues
export default function FarcasterMiniAppReady() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // Only run in Farcaster host or when embedded; safe to call regardless
        const mod = await import("@farcaster/miniapp-sdk");
        if (cancelled) return;
        // Signal that the app is ready to display
        await mod.sdk.actions.ready();
      } catch (err) {
        // Non-fatal outside of Farcaster; ignore in normal web context
        console.debug("Farcaster ready() skipped:", err);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
