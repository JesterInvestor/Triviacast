"use client";

import * as Neynar from "@neynar/react";
import "@neynar/react/dist/style.css";
import { WagmiConfig } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';
import ThirdwebProvider from '@/components/ThirdwebProvider';
import BottomNav from '@/components/BottomNav';

export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode; }>) {
  return (
    <WagmiConfig config={wagmiConfig}>
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
    </WagmiConfig>
  );
}
