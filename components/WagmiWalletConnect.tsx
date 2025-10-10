"use client";

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function WagmiWalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex justify-end flex-1 sm:flex-initial">
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 sm:px-4 sm:py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-xs sm:text-sm border-2 border-[#F4A6B7] font-medium min-h-[44px] flex items-center">
            {address.slice(0, 6)}...{address.slice(-4)}
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

  return (
    <div className="flex justify-end flex-1 sm:flex-initial">
      <button
        onClick={() => {
          const farcasterConnector = connectors.find(
            (connector) => connector.id === 'farcasterMiniApp'
          );
          if (farcasterConnector) {
            connect({ connector: farcasterConnector });
          }
        }}
        className="px-3 py-2 sm:px-4 sm:py-2 bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white rounded-lg text-xs sm:text-sm font-bold min-h-[44px]"
      >
        Connect Wallet
      </button>
    </div>
  );
}
