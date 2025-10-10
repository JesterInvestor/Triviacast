"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function FarcasterMiniAppReady() {
  useEffect(() => {
    (async () => {
      try {
        await sdk.actions.ready({ disableNativeGestures: false });
      } catch {}
    })();
  }, []);
  return null;
}
