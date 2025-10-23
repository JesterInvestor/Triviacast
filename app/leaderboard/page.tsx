"use client";
import Leaderboard from '@/components/Leaderboard';
import ClientOnlyWidgets from '@/components/ClientOnlyWidgets';
import ShareButton from '@/components/ShareButton';
import Link from 'next/link';
import Image from 'next/image';
import { shareLeaderboardUrl } from '@/lib/farcaster';
import React, { useEffect } from 'react';
import { FarcasterProfile } from '@/components/FarcasterProfile';
import { useActiveAccount } from 'thirdweb/react';
import { sdk } from '@farcaster/miniapp-sdk';

export const dynamic = 'force-dynamic';


export default function LeaderboardPage() {
  const account = useActiveAccount();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1]">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Top section: Farcaster profile and wallet connect */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col items-start gap-2 w-full sm:w-auto">
            {account?.address && (
              <FarcasterProfile address={account.address} className="mb-2" />
            )}
            <ClientOnlyWidgets />
          </div>
        </div>
        {/* Header and leaderboard */}
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
