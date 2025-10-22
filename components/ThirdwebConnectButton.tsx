"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, useConnect } from "thirdweb/react";

// Only allow wallets in browser, auto-connect to Farcaster and Base wallets if available
export default function ThirdwebConnectButton() {
  const account = useActiveAccount();
  const { connect, wallets } = useConnect();
  const [autoConnected, setAutoConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || autoConnected || account) return;
    // Try to auto-connect to Farcaster or Base wallet if available
    const farcaster = wallets.find((w) => w.id === "farcaster");
    const base = wallets.find((w) => w.id === "base" || w.name?.toLowerCase().includes("base"));
    if (farcaster && farcaster.installed) {
      connect(farcaster);
      setAutoConnected(true);
    } else if (base && base.installed) {
      connect(base);
      setAutoConnected(true);
    }
  }, [wallets, connect, autoConnected, account]);

  if (typeof window === "undefined") return null;

  if (account) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-sm border-2 border-[#F4A6B7] font-medium min-h-[44px]">
        {account.address.slice(0, 6)}...{account.address.slice(-4)}
      </div>
    );
  }

  // Only show connect options for browser wallets
  return (
    <div className="flex items-center gap-2">
      {wallets.filter((w) => w.type === "browser" && w.installed).map((w) => (
        <button
          key={w.id}
          onClick={() => connect(w)}
          className="px-4 py-3 bg-[#6C47FF] text-white rounded-lg text-sm font-semibold min-h-[44px] w-[160px]"
        >
          Connect {w.name}
        </button>
      ))}
    </div>
  );
}
