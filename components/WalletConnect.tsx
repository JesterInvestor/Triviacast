'use client';

import { ConnectButton } from 'thirdweb/react';
import { createThirdwebClient, type ThirdwebClient } from 'thirdweb';
import { base } from 'thirdweb/chains';

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

let client: ThirdwebClient | undefined;
if (clientId) {
  client = createThirdwebClient({ clientId });
}

export default function WalletConnect() {
  if (!client) {
    return (
      <div className="flex justify-end flex-1 sm:flex-initial">
        <div className="px-3 py-2 sm:px-4 sm:py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-xs sm:text-sm border-2 border-[#F4A6B7] font-medium min-h-[44px] flex items-center">
          <span className="hidden sm:inline">Wallet connection requires Thirdweb Client ID</span>
          <span className="sm:hidden">No Wallet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end flex-1 sm:flex-initial">
      <ConnectButton
        client={client}
        chain={base}
        connectButton={{
          label: 'Connect Wallet',
        }}
        connectModal={{
          size: 'compact',
        }}
      />
    </div>
  );
}
