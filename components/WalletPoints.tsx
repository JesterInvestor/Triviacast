'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getWalletTotalPoints } from '@/lib/tpoints';

export default function WalletPoints() {
  const [walletTotal, setWalletTotal] = useState(0);
  const { address } = useAccount();

  useEffect(() => {
    async function fetchPoints() {
      if (address) {
        const points = await getWalletTotalPoints(address);
        setWalletTotal(points);
      } else {
        setWalletTotal(0);
      }
    }
    fetchPoints();
  }, [address]);

  useEffect(() => {
    const handler = () => {
      (async () => {
        if (address) {
          const points = await getWalletTotalPoints(address);
          setWalletTotal(points);
        }
      })();
    };
    window.addEventListener('triviacast:pointsUpdated', handler);
    return () => { window.removeEventListener('triviacast:pointsUpdated', handler); };
  }, [address]);

  if (!address || walletTotal === 0) {
    return null;
  }

  return (
    <div className="w-full sm:w-auto p-2 sm:p-3 bg-gradient-to-r from-[#FFE4EC] to-[#FFC4D1] rounded-lg border-2 border-[#F4A6B7] shadow-md">
      <div className="text-center">
        <div className="text-xs text-[#5a3d5c] font-semibold">Wallet T Points</div>
        <div className="text-lg sm:text-xl font-bold text-[#DC8291]">
          {walletTotal.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
