"use client";

import { WagmiProvider as WagmiProviderV2 } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { useState } from 'react';
import AutoConnector from './AutoConnector';

// A thin client-side wrapper for Wagmi's provider suitable for Next.js App Router.
// Note: This is now replaced by the provider setup in ClientLayout, but kept for compatibility
export default function WagmiProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProviderV2 config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutoConnector />
        {children}
      </QueryClientProvider>
    </WagmiProviderV2>
  );
}
