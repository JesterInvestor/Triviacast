"use client";

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function WagmiWalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const { connector: activeConnector } = useAccount();

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
        {/* If Farcaster connector exists but isn't ready (desktop), show join link */}
        {connectors.find((c) => c.id === 'farcasterMiniApp' && !c.ready) ? (
          <a
            href="https://farcaster.xyz/~/code/TVNUPF"
            target="_blank"
            rel="noreferrer noopener"
            className="ml-2 inline-block px-3 py-2 sm:px-4 sm:py-2 bg-white text-[#5a3d5c] border-2 border-[#F4A6B7] rounded-lg text-xs sm:text-sm font-medium min-h-[44px]"
          >
            Join Farcaster
          </a>
        ) : null}
      </div>
    </div>
  );
}
