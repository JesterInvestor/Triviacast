"use client";

import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import Quiz from '@/components/Quiz';
import { shareAppUrl } from '@/lib/farcaster';

export const dynamic = 'force-dynamic';

// ...existing code...
import ClientOnlyWidgets from '@/components/ClientOnlyWidgets';
import ShareButton from '@/components/ShareButton';

export default function Home() {
  // Wallet connect handled by WagmiWalletConnect
  useEffect(() => {
    import('@farcaster/miniapp-sdk').then(mod => {
      mod.sdk.actions.ready();
    });
  }, []);

  // ...existing code...
  // Add hooks for wallet info
  const [ethBalance, setEthBalance] = React.useState<string>('0.0000');
  const [username, setUsername] = React.useState<string>('');
  const { address } = useAccount();
  React.useEffect(() => {
    async function fetchBalance() {
      if (address) {
        // Fetch ETH balance
        const res = await fetch(`/api/wallet/balance?address=${address}`);
        const data = await res.json();
        setEthBalance(data.balance || '0.0000');
        // Fetch Farcaster username
        const resp = await fetch(`/api/neynar/user?address=${address}`);
        const json = await resp.json();
        setUsername(json?.result?.user?.username || '');
      }
    }
    fetchBalance();
  }, [address]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
            <Image 
              src="/brain-large.svg" 
              alt="Triviacast Brain" 
              width={50} 
              height={50}
              className="drop-shadow-lg sm:w-[60px] sm:h-[60px] mx-auto"
              priority
            />
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] text-center">
                Triviacast
              </h1>
              <ShareButton
                url={shareAppUrl()}
                className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-3 sm:py-2 sm:px-4 rounded-lg transition shadow-md flex items-center gap-2 justify-center min-h-[40px] text-sm shrink-0"
                ariaLabel="Share app on Farcaster"
              />
            </div>
            {/* subtitle removed per request */}
          </div>
          {/* Wallet connect, then share + tip buttons below */}
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 w-full mt-4">
            <div className="w-full sm:w-auto flex flex-col items-center">
              <ClientOnlyWidgets />
            </div>
          </div>
        </div>
        <Quiz />
      </div>
    </div>
  );
}
