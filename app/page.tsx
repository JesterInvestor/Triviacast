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
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2d1b2e]">Triviacast</h1>
              <p className="text-xs sm:text-sm text-[#5a3d5c]">Test Your Brain Power</p>
            </div>
          </div>
          {/* Center wallet connect, leaderboard, and share button together. All buttons are the same height */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center">
            <WalletPoints />
            <ClientOnlyWidgets />
            <div className="flex flex-row items-center justify-center gap-2 w-full sm:w-auto">
              <Link
                href="/leaderboard"
                className="h-[40px] flex items-center rounded-md bg-[#fff] text-[#c85b86] hover:bg-[#f7f7f7] px-3 py-2 font-semibold text-xs sm:text-sm shadow transition"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Leaderboard
              </Link>
              <ShareButton
                url={shareAppUrl()}
                className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-3 px-3 sm:py-2 sm:px-4 rounded-lg transition shadow-md flex items-center gap-2 justify-center min-h-[44px]"
                ariaLabel="Share app on Farcaster"
              />
            </div>
          </div>
        </div>
        <Quiz />
      </div>
    </div>
  );
}
