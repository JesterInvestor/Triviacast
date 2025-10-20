"use client";

import { useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function WagmiWalletConnect() {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [inMiniApp, setInMiniApp] = useState<boolean | null>(null);
  const autoConnectAttempted = useRef(false);

  // Detect Farcaster miniapp runtime environment
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('@farcaster/miniapp-sdk');
        const sdk = (mod as any).sdk;
        if (!mounted) return;
        if (sdk && typeof sdk.isInMiniApp === 'function') {
          const val = await sdk.isInMiniApp();
          setInMiniApp(Boolean(val));
          return;
        }
      } catch (e) {
        // Not in miniapp SDK/environment
      }
      if (mounted) setInMiniApp(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Auto-connect behavior:
  // - If in Farcaster miniapp, try to auto-connect the farcasterMiniApp connector when available
  // - Heuristic: if running in a Base environment (coinbase wallet present), try to auto-connect coinbase wallet
  useEffect(() => {
    if (autoConnectAttempted.current) return;
    // Only attempt when we know the environment
    if (inMiniApp === null) return;

    const farcasterConnector = connectors.find((c) => c.id === 'farcasterMiniApp');
    const coinbaseConnector = connectors.find((c) => c.id === 'coinbaseWallet' || /coinbase/i.test(c.name || ''));

    (async () => {
      try {
        // If in mini app and farcaster connector available -> auto connect
        if (inMiniApp && farcasterConnector && farcasterConnector.ready && !isConnected) {
          autoConnectAttempted.current = true;
          await connect({ connector: farcasterConnector });
          return;
        }

        // Heuristic for Base app: check for coinbase injected provider or UA containing 'Base'
        const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '').toLowerCase() : '';
        const hasCoinbaseProvider = typeof (window as any).ethereum !== 'undefined' && Boolean((window as any).ethereum.isCoinbaseWallet || (window as any).ethereum.isCoinbaseBrowser);
        const isBaseUA = ua.includes('base') || ua.includes('coinbase');

        if (!inMiniApp && (hasCoinbaseProvider || isBaseUA) && coinbaseConnector && coinbaseConnector.ready && !isConnected) {
          autoConnectAttempted.current = true;
          await connect({ connector: coinbaseConnector });
          return;
        }
      } catch (e) {
        // ignore auto-connect failures
      }
    })();
  }, [inMiniApp, connectors, connect, isConnected]);

  // If connected, show address + active connector
  if (isConnected && address) {
    return (
      <div className="flex justify-end flex-1 sm:flex-initial">
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 sm:px-4 sm:py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-xs sm:text-sm border-2 border-[#F4A6B7] font-medium min-h-[44px] flex items-center">
            {address.slice(0, 6)}...{address.slice(-4)}
            {activeConnector ? (
              <span className="ml-2 text-[10px] bg-white text-black px-2 rounded">
                {activeConnector.id === 'farcasterMiniApp' ? 'Farcaster' : activeConnector.name}
              </span>
            ) : null}
          </div>
          <button
            onClick={() => disconnect()}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-[#F4A6B7] hover:bg-[#E8949C] text-white rounded-lg text-xs sm:text-sm font-medium min-h-[44px]"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // If we know we're in a regular browser (not miniapp), show a link to open the app in Farcaster
  if (inMiniApp === false) {
    const farcasterAppUrl = 'https://farcaster.xyz/miniapps/UmWywlPILouA/triviacast';
    return (
      <div className="flex justify-end flex-1 sm:flex-initial">
        <div className="flex items-center gap-2">
          <a href={farcasterAppUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 sm:px-4 sm:py-2 bg-[#6C47FF] text-white rounded-lg text-xs sm:text-sm font-medium min-h-[44px] flex items-center">
            Open in Farcaster App
          </a>
        </div>
      </div>
    );
  }

  // Fallback: show connector buttons while environment detection is pending or no special handling
  return (
    <div className="flex justify-end flex-1 sm:flex-initial">
      <div className="flex items-center gap-2">
        {connectors.map((c) => {
          const label = c.id === 'farcasterMiniApp' ? 'Farcaster' : c.name;
          return (
            <button
              key={c.id}
              onClick={() => connect({ connector: c })}
              disabled={!c.ready}
              title={!c.ready ? 'Not available in this environment' : undefined}
              className={`px-3 py-2 sm:px-4 sm:py-2 ${c.ready ? 'bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white' : 'bg-gray-200 text-gray-600 cursor-not-allowed'} rounded-lg text-xs sm:text-sm font-bold min-h-[44px]`}
            >
              {`Connect ${label}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
