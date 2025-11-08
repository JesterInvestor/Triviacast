"use client";

import { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';

// Enhanced auto-connect logic:
// 1. Prefer Farcaster Mini App connector when running inside a Farcaster mini app or client.
// 2. Falls back to MetaMask / WalletConnect for Base users.
// 3. Only attempts once per session to avoid repeated prompts/rejections.
// 4. Defers until Farcaster sdk context is ready if sdk loads (to ensure provider injection).
// 5. Uses a small staged attempt window so that if sdk loads slightly later we still auto-connect.

export default function AutoConnector() {
  const { connectors, connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isConnected) return;

    const sessionFlag = 'triviacast_auto_connect_attempted_v2';
    const attempted = sessionStorage.getItem(sessionFlag);
    if (attempted) return;

    let cancelled = false;

    async function detectAndConnect(stage: 'initial' | 'postSdk') {
      if (cancelled || isConnected) return;
      try {
        // ---- Detection ----
        let farcasterContext = false;
        let sdk: any = null;
        try {
          const mod = await import('@farcaster/miniapp-sdk');
          sdk = (mod as any).sdk;
          if (sdk?.context) farcasterContext = true;
        } catch (_) {
          // SDK not yet loaded or not available
        }

        // Window.ethereum heuristics (mini app often injects a provider with markers)
        const eth: any = (window as any).ethereum;
        if (!farcasterContext && eth && (eth.isFarcaster || eth.isMiniApp || eth.isWarpcast)) {
          farcasterContext = true;
        }

        // Detect Base chain (8453) for fallback connectors
        let isOnBaseChain = false;
        if (eth) {
          try {
            const raw = await eth.request?.({ method: 'eth_chainId' }).catch(() => undefined) || eth.chainId || eth.networkVersion;
            if (raw) {
              const n = typeof raw === 'string' && raw.startsWith('0x') ? parseInt(raw, 16) : Number(raw);
              if (!Number.isNaN(n) && n === 8453) isOnBaseChain = true;
            }
          } catch {}
          if (!isOnBaseChain && eth.isMetaMask) isOnBaseChain = true; // heuristic
        }

        // ---- Connector Selection ----
        // Prefer explicit Farcaster Mini App connector id
        let target = connectors.find(c => c.id === 'farcasterMiniApp');

        if (!target && farcasterContext) {
          // Try fuzzy match if id changes in future versions
            target = connectors.find(c => /farcaster|miniapp/i.test(c.id + c.name));
        }

        if (!target) {
          // Preference order for non-farcaster contexts
          const order = ['metamask', 'walletconnect', 'coinbase', 'injected'];
          for (const token of order) {
            target = connectors.find(c => (c.id + c.name).toLowerCase().includes(token));
            if (target) break;
          }
        }

        if (!target && connectors.length) target = connectors[0];

        // ---- Guard against premature attempt before sdk context (stage logic) ----
        if (farcasterContext && !sdk?.context && stage === 'initial') {
          // Wait briefly for sdk.context to populate
          setTimeout(() => detectAndConnect('postSdk'), 600); // small delay
          return;
        }

        if (!target) {
          sessionStorage.setItem(sessionFlag, 'no-connectors');
          return;
        }

        // ---- Connect ----
        try {
          await connect({ connector: target });
        } catch (e) {
          // swallow errors (user rejection or provider issue)
        } finally {
          sessionStorage.setItem(sessionFlag, '1');
        }
      } catch (e) {
        sessionStorage.setItem(sessionFlag, 'error');
      }
    }

    // Kick off initial attempt after a tiny idle to let providers inject
    const t = setTimeout(() => detectAndConnect('initial'), 50);

    return () => { cancelled = true; clearTimeout(t); };
  }, [connectors, connect, isConnected]);

  return null;
}
