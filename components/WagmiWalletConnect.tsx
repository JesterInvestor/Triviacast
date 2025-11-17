"use client";

import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

export default function WagmiWalletConnect() {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { disconnect } = useDisconnect();
  const [profile, setProfile] = useState<{ username?: string | null; displayName?: string | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!isConnected || !address) {
      setProfile(null);
      return () => { mounted = false; };
    }
    (async () => {
      try {
        const res = await fetch(`/api/neynar/user?address=${address}`);
        if (!mounted) return;
        if (res.status === 204) {
          setProfile(null);
          return;
        }
        const json = await res.json();
        // Debug: log fetched profile response
        try { console.debug('[WagmiWalletConnect] fetched neynar profile', { address, json }); } catch (e) {}
        setProfile(json?.result ?? null);
      } catch (e) {
        setProfile(null);
      }
    })();
    return () => { mounted = false; };
  }, [address, isConnected]);

  // Only show connected state if Farcaster MiniApp or Base wallet is active
  if (isConnected && address && activeConnector && (activeConnector.id === 'farcasterMiniApp' || activeConnector.id === 'base')) {
    const label = profile?.username || profile?.displayName || null; // do not fall back to 0x… address
    return (
      <div className="flex items-center gap-2">
        {/* Show avatar + profile label only if profile is available */}
        {label && (
          <div className="flex items-center gap-2">
            <img
              src={`https://cdn.stamp.fyi/avatar/${address}?s=44`}
              alt="Avatar"
              className="rounded-full border-2 border-[#F4A6B7] w-10 h-10"
            />
            <div className="px-3 py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-sm border-2 border-[#F4A6B7] font-medium min-h-[40px] flex items-center">
              <span className="font-semibold">{label}</span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => disconnect()}
          className="px-3 py-2 rounded-lg border-2 border-[#F4A6B7] bg-white text-[#5a3d5c] text-sm font-semibold shadow-sm hover:bg-[#FFF5F7] min-h-[40px]"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // No connect/disconnect UI; only auto-connect supported wallets
  return null;
}

// Change menu removed — intentionally show only the Farcaster username (or displayName)
// when connected. Users can disconnect and reconnect using the Connect UI.
