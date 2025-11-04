"use client";

import { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';

export default function AutoConnector() {
  const { connectors, connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isConnected) return;

    // Only auto-connect if the user was previously connected (to restore session)
    // Check if wagmi has stored a recent connection
    const hasRecentConnection = sessionStorage.getItem('wagmi.recentConnectorId') || 
                                 sessionStorage.getItem('wagmi.store') ||
                                 localStorage.getItem('wagmi.recentConnectorId') ||
                                 localStorage.getItem('wagmi.store');
    
    // Also check if we've already attempted auto-connect this session
    const attempted = sessionStorage.getItem('triviacast_auto_connect_attempted');
    
    // Only auto-connect if there's evidence of a previous connection AND we haven't tried yet
    if (!hasRecentConnection || attempted) return;

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

        // Detect Base chain presence (chainId 8453) without prompting the user.
        let isOnBaseChain = false;
        try {
          const eth = (window as any).ethereum;
          if (eth) {
            // Try to read chainId (may be hex string)
            const raw = await eth.request?.({ method: 'eth_chainId' })
              .catch(() => undefined) || eth.chainId || eth.networkVersion;
            if (raw) {
              const asNumber = typeof raw === 'string' && raw.startsWith('0x') ? parseInt(raw, 16) : Number(raw);
              if (!Number.isNaN(asNumber) && asNumber === 8453) isOnBaseChain = true;
            }
            // Fallback heuristic: MetaMask presence indicates a user wallet we can try to restore
            if (!isOnBaseChain && eth.isMetaMask) {
              isOnBaseChain = true; // prefer trying MetaMask when available
            }
          }
        } catch (_) {
          // ignore detection errors
        }

        // Choose preferred connectors based on detection: farcaster first, then Base wallets
        const preferOrder: string[] = [];
        if (hasFarcasterProvider) preferOrder.push('farcaster', 'miniapp');
        if (isOnBaseChain) preferOrder.push('coinbase', 'metamask', 'walletconnect', 'walletconnectlegacy');

        // Find the first connector that matches our preference list
        let target;
        for (const token of preferOrder) {
          target = connectors.find(c => {
            const id = (c.id || '')?.toString().toLowerCase();
            const name = (c.name || '')?.toString().toLowerCase();
            return id.includes(token) || name.includes(token);
          });
          if (target) break;
        }

        // If we didn't find a preferred connector, fall back to any available connector
        if (!target) target = connectors[0];

        if (target) {
          try {
            await connect({ connector: target });
            sessionStorage.setItem('triviacast_auto_connect_attempted', '1');
          } catch (e) {
            // connecting failed (user denied or unavailable) — do not block app
            sessionStorage.setItem('triviacast_auto_connect_attempted', '1');
          }
        }
      } catch (e) {
        // swallow errors — auto-connect is a best-effort enhancement
      }
    })();
  }, [connectors, connect, isConnected]);

  return null;
}
