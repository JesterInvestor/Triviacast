"use client";
import Leaderboard from '@/components/Leaderboard';

import React, { useEffect, lazy, Suspense } from 'react';
const ThirdwebConnectButton = lazy(() => import('@/components/ThirdwebConnectButton'));
import ShareButton from '@/components/ShareButton';
import Link from 'next/link';
import Image from 'next/image';
import { shareLeaderboardUrl } from '@/lib/farcaster';
import { sdk } from '@farcaster/miniapp-sdk';

export const dynamic = 'force-dynamic';


export default function LeaderboardPage() {
  useEffect(() => {
    (async () => {
      try {
        await sdk.actions.ready();
      } catch {}
    })();
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
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2d1b2e]">Leaderboard</h1>
              <p className="text-xs sm:text-sm text-[#5a3d5c]">Top Brain Power Rankings</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
            {/* Wallet connect UI replaced with Thirdweb connect button */}
            <div className="flex items-center gap-2">
              <ShareButton
                url={shareLeaderboardUrl(null, 0)}
                className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-3 px-3 sm:py-2 sm:px-4 rounded-lg transition shadow-md flex items-center gap-2 justify-center min-h-[44px]"
                ariaLabel="Share leaderboard on Farcaster"
              />
              <Link
                href="/"
                aria-label="Play Quiz — start 10-question timed challenge"
                className="bg-[#FF6B99] hover:bg-[#E85C88] active:bg-[#D94E78] text-white font-extrabold py-3 px-4 sm:py-2 sm:px-4 rounded-lg transition shadow-md flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base"
              >
                <Image src="/brain-small.svg" alt="Brain icon" width={16} height={16} aria-hidden="true" />
                <span>Play Quiz</span>
              </Link>
              <div className="h-[44px] flex items-center">
                <Suspense fallback={null}>
                  {typeof window !== 'undefined' && <ThirdwebConnectButton />}
                </Suspense>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton
                url={shareLeaderboardUrl(null, 0)}
                className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-3 px-3 sm:py-2 sm:px-4 rounded-lg transition shadow-md flex items-center gap-2 justify-center min-h-[44px]"
                ariaLabel="Share leaderboard on Farcaster"
              />

              <Link
                href="/"
                aria-label="Play Quiz — start 10-question timed challenge"
                className="bg-[#FF6B99] hover:bg-[#E85C88] active:bg-[#D94E78] text-white font-extrabold py-3 px-4 sm:py-2 sm:px-4 rounded-lg transition shadow-md flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base"
              >
                <Image src="/brain-small.svg" alt="Brain icon" width={16} height={16} aria-hidden="true" />
                <span>Play Quiz</span>
              </Link>
            </div>
          </div>
        </div>
        <Leaderboard />
      </div>
    </div>
  );
}
