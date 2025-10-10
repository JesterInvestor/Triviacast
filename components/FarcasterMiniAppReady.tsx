"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

// Minimal, host-friendly ready() call: fire once on mount and ignore errors.
export default function FarcasterMiniAppReady() {
  useEffect(() => {
    (async () => {
      try {
        console.log("[Triviacast] FarcasterMiniAppReady: effect start", {
          ts: Date.now(),
          readyState: document?.readyState,
          visibility: document?.visibilityState,
        });
      } catch {}
      try {
        console.log("[Triviacast] FarcasterMiniAppReady: calling sdk.actions.ready()");
        await sdk.actions.ready();
        console.log("[Triviacast] FarcasterMiniAppReady: ready() resolved");
      } catch {
        // Ignore in non-host environments or if host isn't ready yet
        console.log("[Triviacast] FarcasterMiniAppReady: ready() error (ignored)");
      }
    })();
  }, []);
  return null;
}
