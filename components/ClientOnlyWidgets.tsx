"use client";

import { useEffect, useState } from 'react';
import AddMiniAppPrompt from './AddMiniAppPrompt';
import StakingDailyClaimPrompt from './StakingDailyClaimPrompt';
import Toaster from './Toaster';
import ClientErrorBoundary from './ClientErrorBoundary';

export default function ClientOnlyWidgets() {
  const [MiniAppProviderComp, setMiniAppProviderComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('@neynar/react');
        if (mounted && mod && mod.MiniAppProvider) {
          setMiniAppProviderComp(() => mod.MiniAppProvider as React.ComponentType<any>);
        }
      } catch {
        // optional dependency not available — render children without provider
      }
    })();
    return () => { mounted = false; };
  }, []);

  const content = (
    <>
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
