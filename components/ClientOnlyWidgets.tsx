"use client";

import { useEffect, useState } from 'react';
import AddMiniAppPrompt from './AddMiniAppPrompt';
import StakingDailyClaimPrompt from './StakingDailyClaimPrompt';
import Toaster from './Toaster';
import ClientErrorBoundary from './ClientErrorBoundary';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { createWallet, walletConnect } from 'thirdweb/wallets';
import { client } from '@/lib/thirdwebClient';

export default function ClientOnlyWidgets() {
  const [MiniAppProviderComp, setMiniAppProviderComp] = useState<React.ComponentType<React.PropsWithChildren<unknown>> | null>(null);
  const account = useActiveAccount();

  useEffect(() => {
    let mounted = true;
      (async () => {
        try {
          // Use eval import to avoid bundlers attempting to resolve optional package at build-time
          const mod = await (eval('import("@neynar/react")') as Promise<unknown>);
        if (mounted && mod && (mod as any).MiniAppProvider) {
          setMiniAppProviderComp(() => (mod as any).MiniAppProvider as React.ComponentType<React.PropsWithChildren<unknown>>);
        }
      } catch {
        // optional dependency not available — render children without provider
      }
    })();
    return () => { mounted = false; };
  }, []);

  const content = (
    <>
      <ConnectButton 
        client={client}
        // WalletConnect for mobile wallets (Base Wallet) + injected wallets (MetaMask / Farcaster injected)
        wallets={[
          // Injected EIP-1193 wallets via MetaMask adapter
          createWallet('io.metamask'),
          // Coinbase/CBW extension (covers many Base users on desktop)
          createWallet('com.coinbase.wallet'),
          // WalletConnect QR modal for Base Wallet and others
          walletConnect(),
        ]}
        connectButton={{
          label: "Connect Wallet",
        }}
        connectModal={{
          title: "Connect your wallet",
        }}
      />
      {/* Wallet address display removed as requested */}
      <AddMiniAppPrompt />
      <StakingDailyClaimPrompt />
      <Toaster />
    </>
  );

  return (
    <ClientErrorBoundary>
      {MiniAppProviderComp ? (
        <MiniAppProviderComp>{content}</MiniAppProviderComp>
      ) : (
        content
      )}
    </ClientErrorBoundary>
  );
}
