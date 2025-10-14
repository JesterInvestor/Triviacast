"use client";
import Leaderboard from '@/components/Leaderboard';
import WalletConnect from '@/components/WalletConnect';
import ShareButton from '@/components/ShareButton';
import Link from 'next/link';
import Image from 'next/image';
import { shareLeaderboardUrl } from '@/lib/farcaster';
import React, { useEffect } from 'react';
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
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Sticky CTA on mobile, static on larger screens */}
            <div className="sticky sm:static top-0 z-50 w-full sm:w-auto">
              <Link
                href="/"
                aria-label="Play Quiz — start 10-question timed challenge"
                className="w-full bg-[#FF6B99] hover:bg-[#E85C88] active:bg-[#D94E78] text-white font-extrabold py-4 px-5 sm:py-2 sm:px-6 rounded-lg transition shadow-md flex items-center justify-center gap-3 sm:flex-initial min-h-[56px] text-lg sm:text-base"
              >
                <img src="/brain-small.svg" alt="Brain icon" className="w-5 h-5" aria-hidden="true" />
                <span>Play Quiz</span>
              </Link>
            </div>
            <WalletConnect />
            <ShareButton
              url={shareLeaderboardUrl(null, 0)}
              className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-3 px-4 sm:py-2 sm:px-6 rounded-lg transition shadow-md flex items-center gap-2 justify-center flex-1 sm:flex-initial min-h-[44px]"
              ariaLabel="Share leaderboard on Farcaster"
            >
              <img src="/farcaster.svg" alt="Farcaster" className="w-4 h-4" />
              <span className="hidden xs:inline">Share</span>
            </ShareButton>
          </div>
        </div>
        <Leaderboard />
      </div>
    </div>
  );
}
