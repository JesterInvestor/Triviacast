"use client";


import { useEffect, useState } from "react";
import { useActiveAccount, useConnect } from "thirdweb/react";
import { metamaskWallet } from "thirdweb/wallets/metamask";
import { coinbaseWallet } from "thirdweb/wallets/coinbase";
import { walletConnect } from "thirdweb/wallets/walletConnect";

// Only allow wallets in browser, auto-connect to Farcaster and Base wallets if available
export default function ThirdwebConnectButton() {

  // Explicitly configure supported wallets
  const supportedWallets = [
    metamaskWallet(),
    coinbaseWallet(),
    walletConnect(),
  ];

  const account = useActiveAccount();
  const { connect, isConnecting, error, cancelConnection } = useConnect();
  const [autoConnected, setAutoConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || autoConnected || account) return;
    // Try to auto-connect to MetaMask or Coinbase if available
    const metaMask = supportedWallets.find((w) => w.id === "metamask");
    const coinbase = supportedWallets.find((w) => w.id === "coinbase");
    if (metaMask && metaMask.isInstalled?.()) {
      connect(metaMask);
      setAutoConnected(true);
    } else if (coinbase && coinbase.isInstalled?.()) {
      connect(coinbase);
      setAutoConnected(true);
    }
  }, [connect, autoConnected, account]);

  if (typeof window === "undefined") return null;

  if (account) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-sm border-2 border-[#F4A6B7] font-medium min-h-[44px]">
        {account.address.slice(0, 6)}...{account.address.slice(-4)}
      </div>
    );
  }

  // Only show connect options for browser wallets that are installed
  return (
    <div className="flex items-center gap-2">
      {supportedWallets.filter((w) => w.isInstalled?.()).map((w) => (
        <button
          key={w.id}
          onClick={() => connect(w)}
          className="px-4 py-3 bg-[#6C47FF] text-white rounded-lg text-sm font-semibold min-h-[44px] w-[160px]"
          disabled={isConnecting}
        >
          Connect {w.id.charAt(0).toUpperCase() + w.id.slice(1)}
        </button>
      ))}
      {error && <span className="text-red-500 text-xs ml-2">{error.message}</span>}
    </div>
  );
}
