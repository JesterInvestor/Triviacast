"use client";

import AddMiniAppPrompt from './AddMiniAppPrompt';
import StakingDailyClaimPrompt from './StakingDailyClaimPrompt';
import Toaster from './Toaster';

export default function ClientOnlyWidgets() {
  return (
    <>
      <AddMiniAppPrompt />
      <StakingDailyClaimPrompt />
      <Toaster />
    </>
  );
}
