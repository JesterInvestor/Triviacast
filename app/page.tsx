"use client";

import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import Quiz from '@/components/Quiz';
import { shareAppUrl } from '@/lib/farcaster';

export const dynamic = 'force-dynamic';

// ...existing code...
import WalletPoints from '@/components/WalletPoints';
import ClientOnlyWidgets from '@/components/ClientOnlyWidgets';
import ShareButton from '@/components/ShareButton';
import Link from 'next/link';

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
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2d1b2e] flex items-center gap-2 justify-center text-center">
              Triviacast
              <ShareButton
                url={shareAppUrl()}
                className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-3 rounded-lg transition shadow-md flex items-center gap-2 justify-center min-h-[32px] ml-2"
                ariaLabel="Share app on Farcaster"
              />
            </h1>
            <p className="text-xs sm:text-sm text-[#5a3d5c] text-center">Test Your Brain Power</p>
          </div>
          {/* Points, widgets, and leaderboard button only */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full mt-4">
            <div className="w-full sm:w-auto flex flex-col items-center">
              <WalletPoints />
            </div>
            <div className="w-full sm:w-auto flex flex-col items-center">
              <ClientOnlyWidgets />
            </div>
            <Link
              href="/leaderboard"
              className="h-[40px] flex items-center rounded-md bg-[#fff] text-[#c85b86] hover:bg-[#f7f7f7] px-3 py-2 font-semibold text-xs sm:text-sm shadow transition w-full sm:w-auto justify-center"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Leaderboard
            </Link>
          </div>
        </div>
        <Quiz />
      </div>
    </div>
  );
}
