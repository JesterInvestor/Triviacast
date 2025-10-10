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
      <div className="flex justify-end">
        <div className="px-4 py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-sm border-2 border-[#F4A6B7] font-medium">
          Wallet connection requires Thirdweb Client ID
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
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
