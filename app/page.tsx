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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[var(--brain-pale)] to-[var(--brain-light)]">
      <div className="w-full max-w-lg mx-auto px-2 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
            <div className="bg-[var(--brain-light)] rounded-full p-3 shadow-lg mb-2 flex items-center justify-center">
              <Image 
                src="/brain-large.svg" 
                alt="Triviacast Brain" 
                width={60} 
                height={60}
                className="drop-shadow-lg w-[60px] h-[60px] mx-auto"
                priority
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-dark)] flex items-center gap-2 justify-center text-center leading-tight">
              Triviacast
              <ShareButton
                url={shareAppUrl()}
                className="bg-[var(--brain-dark)] hover:bg-[var(--brain-tertiary)] text-white font-bold py-2 px-4 rounded-lg transition shadow flex items-center gap-2 justify-center min-h-[36px] ml-2"
                ariaLabel="Share app on Farcaster"
              >
                <span className="hidden sm:inline">Share</span>
              </ShareButton>
            </h1>
            <p className="text-base sm:text-lg text-[var(--text-medium)] text-center mt-1">Test Your Brain Power</p>
          </div>
          <div className="flex flex-col items-center gap-4 w-full mt-4">
            <div className="w-full flex flex-col items-center">
              <WalletPoints />
            </div>
            <div className="w-full flex flex-col items-center">
              <ClientOnlyWidgets />
            </div>
            <Link
              href="/leaderboard"
              className="h-[48px] flex items-center rounded-xl bg-[var(--brain-accent)] text-white hover:bg-[var(--brain-dark)] px-4 py-2 font-semibold text-base shadow transition w-full justify-center mt-2"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Leaderboard
            </Link>
          </div>
        </div>
        <div className="w-full bg-white rounded-2xl shadow-lg p-4 mt-2 mb-4">
          <Quiz />
        </div>
      </div>
    </div>
  );
}
