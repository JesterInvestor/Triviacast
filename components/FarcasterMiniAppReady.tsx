"use client";

import { useEffect } from "react";

export default function FarcasterMiniAppReady() {
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('@farcaster/miniapp-sdk');
        const { sdk } = mod;
        // Check if we are actually in a Mini App before calling ready()
        let inMini = false;
        try {
          const check = sdk.isInMiniApp?.() ?? Promise.resolve(false);
          inMini = await Promise.race([
            check,
            new Promise<boolean>((res) => setTimeout(() => res(false), 200)),
          ]);
        } catch {
          inMini = false;
        }
        if (inMini) {
          await sdk.actions.ready({ disableNativeGestures: false });
        }
      } catch {}
    })();
  }, []);
  return null;
}
