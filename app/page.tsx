"use client";

import React, { useEffect } from 'react';
import Image from 'next/image';
import Quiz from '@/components/Quiz';
import { shareAppUrl } from '@/lib/farcaster';

export const dynamic = 'force-dynamic';

import WalletConnect from '@/components/WalletConnect';
import WalletPoints from '@/components/WalletPoints';
import ShareButton from '@/components/ShareButton';
import Link from 'next/link';

export default function Home() {
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('@farcaster/miniapp-sdk');
        const { sdk } = mod;
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
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2d1b2e]">Triviacast</h1>
              <p className="text-xs sm:text-sm text-[#5a3d5c]">Test Your Brain Power</p>
            </div>
          </div>
          {/* Center wallet connect, leaderboard, and share button together. All buttons are the same height */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center">
            <WalletPoints />
            <div className="flex flex-row items-center justify-center gap-2 w-full sm:w-auto">
              <div className="h-[40px] flex items-center">
                <WalletConnect />
              </div>
              <Link
                href="/leaderboard"
                className="h-[40px] flex items-center rounded-md bg-[#fff] text-[#c85b86] hover:bg-[#f7f7f7] px-3 py-2 font-semibold text-xs sm:text-sm shadow transition"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Leaderboard
              </Link>
              <div className="h-[40px] flex items-center rounded-md bg-[#c85b86] px-3 py-2 shadow transition">
                <ShareButton url={shareAppUrl()} />
              </div>
            </div>
          </div>
        </div>
        <Quiz />
      </div>
    </div>
  );
}
