'use client';

import { ConnectButton } from 'thirdweb/react';
import { base } from 'thirdweb/chains';
import { createWallet } from 'thirdweb/wallets';
import { client } from '@/lib/thirdweb';

import { useEffect, useState } from 'react';

// Configure wallets: External wallets only (no social/email/phone login)
const wallets = client ? [
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
  createWallet('me.rainbow'),
  createWallet('io.rabby'),
  createWallet('io.zerion.wallet'),
] : [];

export default function WalletConnect() {
  const [inMiniApp, setInMiniApp] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('@farcaster/miniapp-sdk');
        const { sdk } = mod;
        if (!mounted) return;
        if (typeof sdk.isInMiniApp === 'function') {
          const v = await sdk.isInMiniApp();
          setInMiniApp(Boolean(v));
          return;
        }
      } catch (e) {
        // SDK not available in browser — treat as not in mini app
      }
      if (mounted) setInMiniApp(false);
    })();
    return () => { mounted = false; };
  }, []);
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

  // If we are sure we're not in a mini app (i.e., browser), show a CTA to open in Farcaster
  if (inMiniApp === false) {
    const encoded = encodeURIComponent(window.location.href);
    const previewUrl = `https://farcaster.xyz/~/developers/mini-apps/preview?url=${encoded}`;
    return (
      <div className="flex justify-center sm:flex-initial">
        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 sm:px-4 sm:py-2 bg-[#6C47FF] text-white rounded-lg text-xs sm:text-sm font-medium min-h-[44px] flex items-center">
          Open in Farcaster App
        </a>
      </div>
    );
  }

  // Otherwise render the standard connect button while we wait for inMiniApp to resolve
  return (
    <div className="flex justify-center sm:flex-initial">
      <ConnectButton
        client={client}
        chain={base}
        wallets={wallets}
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
