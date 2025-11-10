'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useIQPoints } from '@/lib/hooks/useIQPoints';

export default function WalletIQPoints() {
  const { address } = useAccount();
  const { iqPoints } = useIQPoints(address as `0x${string}` | undefined);
  const [display, setDisplay] = useState<string>('');

  useEffect(() => {
    if (!address || !iqPoints || iqPoints === 0n) { setDisplay(''); return; }
    try { setDisplay(Number(iqPoints).toLocaleString()); } catch { setDisplay(iqPoints.toString()); }
  }, [address, iqPoints]);

  if (!address || !display) return null;

  return (
    <div className="w-full sm:w-auto p-2 sm:p-3 bg-gradient-to-r from-[#E3F5FF] to-[#C4E8FF] rounded-lg border-2 border-[#7BC3EC] shadow-md mt-2">
      <div className="text-center">
        <div className="text-xs text-[#1b3d5c] font-semibold flex items-center justify-center gap-1">
          <span role="img" aria-label="brain">🧠</span> Wallet iQ
        </div>
        <div className="text-lg sm:text-xl font-bold text-[#2d6c8e]">{display}</div>
      </div>
    </div>
  );
}
