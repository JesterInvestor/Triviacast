"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

export default function WagmiWalletConnect() {
  const { address, isConnected, connector: activeConnector } = useAccount();
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
        setProfile(json?.result ?? null);
      } catch (e) {
        setProfile(null);
      }
    })();
    return () => { mounted = false; };
  }, [address, isConnected]);

  // Only show connected state if Farcaster MiniApp or Base wallet is active
  if (isConnected && address && activeConnector && (activeConnector.id === 'farcasterMiniApp' || activeConnector.id === 'base')) {
    const label = profile?.username || profile?.displayName || `${address.slice(0,6)}…${address.slice(-4)}`;
    return (
      <div className="flex justify-end flex-1 sm:flex-initial">
        <div className="flex items-center gap-2">
          {/* Base avatar */}
          <img
            src={`https://cdn.stamp.fyi/avatar/${address}?s=44`}
            alt="Base Avatar"
            className="rounded-full border-2 border-[#F4A6B7] w-11 h-11"
            style={{ marginRight: '8px' }}
          />
          <div className="px-3 py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-sm border-2 border-[#F4A6B7] font-medium min-h-[44px] flex items-center">
            <span className="font-semibold mr-2">{label}</span>
            <span className="ml-2 text-[10px] bg-white text-black px-2 rounded">
              {activeConnector.id === 'farcasterMiniApp' ? 'Farcaster' : 'Base'}
            </span>
            <span className="ml-2 text-green-600 font-bold">Wallet Connected</span>
          </div>
        </div>
      </div>
    );
  }

  // No connect/disconnect UI; only auto-connect supported wallets
  return null;
}

// Change menu removed — intentionally show only the Farcaster username (or displayName)
// when connected. Users can disconnect and reconnect using the Connect UI.
