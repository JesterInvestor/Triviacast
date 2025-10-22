"use client";

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function WagmiWalletConnect() {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showOptions, setShowOptions] = useState(false);
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

  // Connected view: show Farcaster username, Base avatar, and 'Wallet Connected'. No disconnect allowed.
  if (isConnected && address) {
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
            {activeConnector ? (
              <span className="ml-2 text-[10px] bg-white text-black px-2 rounded">
                {activeConnector.id === 'farcasterMiniApp' ? 'Farcaster' : activeConnector.name}
              </span>
            ) : null}
            <span className="ml-2 text-green-600 font-bold">Wallet Connected</span>
          </div>
        </div>
      </div>
    );
  }

  // Mobile-first: single Connect button that reveals connector options when tapped
  return (
    <div className="flex justify-end flex-1 sm:flex-initial">
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowOptions((s) => !s)}
            className="px-4 py-3 bg-[#6C47FF] text-white rounded-lg text-sm font-semibold min-h-[44px] w-[160px]"
          >
            Connect Wallet
          </button>

          {showOptions ? (
            <div className="mt-2 w-[220px] bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2 z-50">
              {connectors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setShowOptions(false);
                    connect({ connector: c });
                  }}
                  disabled={!c.ready}
                  className={`w-full text-left px-3 py-2 rounded ${c.ready ? 'bg-[#F4A6B7] text-white' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                >
                  {c.name ?? c.id}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Change menu removed — intentionally show only the Farcaster username (or displayName)
// when connected. Users can disconnect and reconnect using the Connect UI.
