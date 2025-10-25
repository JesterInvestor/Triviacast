"use client";

import React, { useEffect } from 'react';
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
  const { address } = require('wagmi').useAccount();
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
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1]">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Image 
              src="/brain-large.svg" 
              alt="Triviacast Brain" 
              width={50} 
              height={50}
              className="drop-shadow-lg sm:w-[60px] sm:h-[60px]"
              priority
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2d1b2e] flex items-center gap-2">
                Triviacast
                <ShareButton
                  url={shareAppUrl()}
                  className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-3 rounded-lg transition shadow-md flex items-center gap-2 justify-center min-h-[32px] ml-2"
                  ariaLabel="Share app on Farcaster"
                />
              </h1>
              <p className="text-xs sm:text-sm text-[#5a3d5c]">Test Your Brain Power</p>
            </div>
          </div>
          {/* Wallet info and points */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center">
            <div className="flex flex-col items-center justify-center bg-white rounded-lg border-2 border-[#F4A6B7] shadow-md px-4 py-2">
              <span className="font-bold text-[#DC8291]">{username || 'Wallet'}</span>
              <span className="text-xs text-gray-500">{address}</span>
              <span className="text-xs text-[#5a3d5c]">{ethBalance} ETH</span>
            </div>
            <WalletPoints />
            <ClientOnlyWidgets />
            <Link
              href="/leaderboard"
              className="h-[40px] flex items-center rounded-md bg-[#fff] text-[#c85b86] hover:bg-[#f7f7f7] px-3 py-2 font-semibold text-xs sm:text-sm shadow transition"
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
