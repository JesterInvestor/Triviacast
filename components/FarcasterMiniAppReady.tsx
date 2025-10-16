"use client";

import { useEffect } from "react";

export default function FarcasterMiniAppReady() {
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('@farcaster/miniapp-sdk');
        const { sdk } = mod;
        await sdk.actions.ready({ disableNativeGestures: false });
      } catch {}
    })();
  }, []);
  return null;
}
