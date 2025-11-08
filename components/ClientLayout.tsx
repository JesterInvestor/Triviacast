"use client";

import * as Neynar from "@neynar/react";
import "@neynar/react/dist/style.css";
import { WagmiConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { wagmiConfig } from '@/lib/wagmi';
import BottomNav from '@/components/BottomNav';

export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode; }>) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiConfig config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
    </WagmiConfig>
  );
}
