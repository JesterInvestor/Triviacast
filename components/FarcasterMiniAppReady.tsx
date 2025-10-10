"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

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
        await sdk.actions.ready({ disableNativeGestures: false });
        console.log("[Triviacast] FarcasterMiniAppReady: ready() resolved");
      } catch {
        console.log("[Triviacast] FarcasterMiniAppReady: ready() error (ignored)");
      }
    })();
  }, []);
  return null;
}
