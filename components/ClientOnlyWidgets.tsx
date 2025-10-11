"use client";

import AddMiniAppPrompt from './AddMiniAppPrompt';
import StakingDailyClaimPrompt from './StakingDailyClaimPrompt';
import Toaster from './Toaster';
import ClientErrorBoundary from './ClientErrorBoundary';

export default function ClientOnlyWidgets() {
  return (
    <ClientErrorBoundary>
      <AddMiniAppPrompt />
      <StakingDailyClaimPrompt />
      <Toaster />
    </ClientErrorBoundary>
  );
}
