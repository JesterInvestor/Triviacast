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

  // Show connected state for any wallet
  if (isConnected && address && activeConnector) {
    const label = profile?.username || profile?.displayName || `${address.slice(0,6)}…${address.slice(-4)}`;
    
    // Determine wallet type for display
    const getWalletLabel = () => {
      const id = activeConnector.id?.toLowerCase() || '';
      if (id.includes('farcaster')) return 'Farcaster';
      if (id.includes('coinbase')) return 'Base';
      if (id.includes('metamask')) return 'MetaMask';
      if (id.includes('walletconnect')) return 'WalletConnect';
      return 'Wallet';
    };
    
    return (
      <div className="flex justify-end flex-1 sm:flex-initial">
        <div className="flex items-center gap-2">
          {/* Base avatar */}
          <img
            src={`https://cdn.stamp.fyi/avatar/${address}?s=44`}
            alt="Wallet Avatar"
            className="rounded-full border-2 border-[#F4A6B7] w-11 h-11"
            style={{ marginRight: '8px' }}
          />
          <div className="px-3 py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-sm border-2 border-[#F4A6B7] font-medium min-h-[44px] flex items-center">
            <span className="font-semibold mr-2">{label}</span>
            <span className="ml-2 text-[10px] bg-white text-black px-2 rounded">
              {getWalletLabel()}
            </span>
            <span className="ml-2 text-green-600 font-bold">Connected</span>
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
