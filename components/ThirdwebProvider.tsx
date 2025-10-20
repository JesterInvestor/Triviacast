'use client';

import { ThirdwebProvider as Thirdweb } from 'thirdweb/react';
import { client } from '@/lib/thirdweb';
import { useEffect } from 'react';

export default function ThirdwebProvider({ children }: { children: React.ReactNode }) {
  // Minimal auto-detect: if running inside a Farcaster miniapp and the SDK
  // exposes an EIP-1193 provider, set it on window.ethereum so thirdweb/wagmi
  // and other libraries pick it up automatically. This is intentionally
  // non-invasive and keeps the rest of the app unchanged.
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      try {
        const mod = await import('@farcaster/miniapp-sdk');
        const { sdk } = mod as { sdk?: { actions?: { ready?: () => Promise<void> }; wallet?: { getEthereumProvider?: () => Promise<unknown> } } };
        // If the SDK is present and exposes helper functions, call ready() and
        // wire any EIP-1193 provider it exposes to window.ethereum. We do not
        // gate this on an `isInMiniApp` check so the app loads the same way on
        // all platforms; failure is silently ignored.
        if (sdk) {
          try { await sdk.actions?.ready?.(); } catch {}
          const provider = await sdk.wallet?.getEthereumProvider?.();
          if (provider && !(window as unknown as { ethereum?: unknown }).ethereum) {
            (window as unknown as { ethereum?: unknown }).ethereum = provider;
            console.debug('Farcaster EIP-1193 provider (if available) wired to window.ethereum');
          }
        }
      } catch (e) {
        // ignore — not running in miniapp or SDK not available
      }
    })();
  }, []);
  // If a thirdweb client is configured, provide it. Otherwise render children directly
  // to avoid runtime errors in environments without a thirdweb client.
  // Render Thirdweb provider as before. The Thirdweb provider's internal
  // implementation will handle absence of a configured client gracefully.
  return <Thirdweb>{children}</Thirdweb>;
}
