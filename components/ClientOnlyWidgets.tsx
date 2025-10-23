"use client";

import { useEffect, useState } from 'react';
import AddMiniAppPrompt from './AddMiniAppPrompt';
import StakingDailyClaimPrompt from './StakingDailyClaimPrompt';
import Toaster from './Toaster';
import ClientErrorBoundary from './ClientErrorBoundary';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
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
      <ConnectButton client={client} />
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
