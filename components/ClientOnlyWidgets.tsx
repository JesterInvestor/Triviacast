"use client";

import { MiniAppProvider } from '@neynar/react';
import AddMiniAppPrompt from './AddMiniAppPrompt';
import StakingDailyClaimPrompt from './StakingDailyClaimPrompt';
import Toaster from './Toaster';
import ClientErrorBoundary from './ClientErrorBoundary';

export default function ClientOnlyWidgets() {
  return (
    <ClientErrorBoundary>
      <MiniAppProvider>
        <AddMiniAppPrompt />
        <StakingDailyClaimPrompt />
        <Toaster />
      </MiniAppProvider>
    </ClientErrorBoundary>
  );
}
