"use client";

import * as Neynar from "@neynar/react";
import "@neynar/react/dist/style.css";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';
import ThirdwebProvider from '@/components/ThirdwebProvider';
import BottomNav from '@/components/BottomNav';
import AutoConnector from '@/components/AutoConnector';
import { useState } from 'react';

export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode; }>) {
  // Create QueryClient inside component to ensure it's only created once on client
  const [queryClient] = useState(() => new QueryClient());
  
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutoConnector />
        <ThirdwebProvider>
          <Neynar.NeynarContextProvider
            settings={{
              clientId: process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "",
              defaultTheme: Neynar.Theme.Light,
              eventsCallbacks: {
                onAuthSuccess: () => {},
                onSignout() {},
              },
            }}
          >
            {children}
            <BottomNav />
          </Neynar.NeynarContextProvider>
        </ThirdwebProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
