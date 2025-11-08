"use client";
import Leaderboard from '@/components/Leaderboard';
import ClientOnlyWidgets from '@/components/ClientOnlyWidgets';
import ShareButton from '@/components/ShareButton';
import WagmiWalletConnect from '@/components/WagmiWalletConnect';
import Link from 'next/link';
import Image from 'next/image';
import { shareLeaderboardUrl } from '@/lib/farcaster';
import React, { useEffect } from 'react';
import { FarcasterProfile } from '@/components/FarcasterProfile';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';

export const dynamic = 'force-dynamic';


export default function LeaderboardPage() {
  const { address } = useAccount();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl px-2 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        {/* Top bar: wallet connect + share aligned like home page */}
        <div className="w-full flex items-center justify-end gap-2 mb-2 sm:mb-4">
          <WagmiWalletConnect />
          <ShareButton
            url={shareLeaderboardUrl(null, 0)}
            className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-3 sm:py-2 sm:px-4 rounded-lg transition shadow-md flex items-center gap-2 justify-center min-h-[40px] text-sm shrink-0"
            ariaLabel="Share leaderboard on Farcaster"
          />
        </div>
        {/* Header and leaderboard */}
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
            <h1 className="text-5xl sm:text-6xl font-extrabold text-[#2d1b2e] text-center">Leaderboard</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full mt-4">
            <Link
              href="/"
              aria-label="Play Quiz — start 10-question timed challenge"
              className="bg-[#FF6B99] hover:bg-[#E85C88] active:bg-[#D94E78] text-white font-extrabold py-3 px-4 sm:py-2 sm:px-4 rounded-lg transition shadow-md flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
            >
              <Image src="/brain-small.svg" alt="Brain icon" width={16} height={16} aria-hidden="true" />
              <span>Play Quiz</span>
            </Link>
            {address && (
              <div className="w-full sm:w-auto flex flex-col items-center justify-center">
                <FarcasterProfile address={address} className="mt-2 sm:mt-0" />
              </div>
            )}
          </div>
        </div>
        {/* Top section: ClientOnlyWidgets */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col items-start gap-2 w-full sm:w-auto">
            <ClientOnlyWidgets />
          </div>
        </div>
        <Leaderboard />
      </div>
    </div>
  );
}
