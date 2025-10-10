"use client";
import React, { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import Image from 'next/image';
import Quiz from '@/components/Quiz';
import { shareAppUrl } from '@/lib/farcaster';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';


import WalletConnect from '@/components/WalletConnect';
import WalletPoints from '@/components/WalletPoints';
import ShareButton from '@/components/ShareButton';
import Link from 'next/link';



export default function Home() {
  useEffect(() => {
    window.onload = async () => {
      try {
        await sdk.actions.ready();
      } catch {}
    };
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <WalletPoints />
            <div className="flex items-center gap-2 sm:gap-4">
              <WalletConnect />
              <Link
                href="/leaderboard"
                className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-3 px-4 sm:py-2 sm:px-6 rounded-lg transition shadow-lg flex items-center gap-2 justify-center flex-1 sm:flex-initial min-h-[44px]"
              >
                🏆 <span className="hidden xs:inline">Leaderboard</span>
              </Link>
              <ShareButton
                url={shareAppUrl()}
                className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-3 px-4 sm:py-2 sm:px-6 rounded-lg transition shadow-lg flex items-center gap-2 justify-center flex-1 sm:flex-initial min-h-[44px]"
                ariaLabel="Share on Farcaster"
              >
                <img src="/farcaster.svg" alt="Farcaster" className="w-4 h-4" />
                <span className="hidden xs:inline">Share</span>
              </ShareButton>
            </div>
          </div>
        </div>
        <Quiz />
      </div>
    </div>
  );
}
