"use client";

import { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';

export default function AutoConnector() {
  const { connectors, connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isConnected) return;

    // Only attempt once per session to avoid repeated prompts.
    const attempted = sessionStorage.getItem('triviacast_auto_connect_attempted');
    if (attempted) return;

    (async () => {
      try {
        // Detect Farcaster miniapp SDK or provider presence
        let hasFarcasterProvider = false;
        try {
          const mod = await import('@farcaster/miniapp-sdk');
          hasFarcasterProvider = !!(mod?.sdk);
        } catch (_) {
          // ignore
        }
        if (!hasFarcasterProvider && typeof (window as any).ethereum !== 'undefined') {
          // There might still be a provider exposed by the miniapp as window.ethereum
          hasFarcasterProvider = true;
        }

        // Prefer a farcaster/miniapp connector when provider detected
        if (hasFarcasterProvider) {
          const target = connectors.find(c => {
            const id = (c.id || '').toString().toLowerCase();
            const name = (c.name || '').toString().toLowerCase();
            return id.includes('farcaster') || id.includes('miniapp') || name.includes('farcaster') || name.includes('miniapp');
          });

          if (target) {
            try {
              await connect({ connector: target });
              sessionStorage.setItem('triviacast_auto_connect_attempted', '1');
            } catch (e) {
              // connecting failed (user denied or unavailable) — do not block app
              sessionStorage.setItem('triviacast_auto_connect_attempted', '1');
            }
          }
        }
      } catch (e) {
        // swallow errors — auto-connect is a best-effort enhancement
      }
    })();
  }, [connectors, connect, isConnected]);

  return null;
}
