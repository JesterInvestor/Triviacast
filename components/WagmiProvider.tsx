"use client";

import { WagmiConfig } from 'wagmi';
import { useAutoConnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import { useState } from 'react';

// A thin client-side wrapper for Wagmi's provider suitable for Next.js App Router.
  const [queryClient] = useState(() => new QueryClient());
  useAutoConnect();
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfig>
  );
}
