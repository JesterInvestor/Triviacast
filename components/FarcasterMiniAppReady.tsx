"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

// Minimal, host-friendly ready() call: fire once on mount and ignore errors.
export default function FarcasterMiniAppReady() {
  useEffect(() => {
    (async () => {
      try {
        await sdk.actions.ready();
      } catch {
        // Ignore in non-host environments or if host isn't ready yet
      }
    })();
  }, []);
  return null;
}
