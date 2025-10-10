'use client';

import { useEffect, useState } from 'react';
import { LeaderboardEntry } from '@/types/quiz';
import { getLeaderboard, getWalletTotalPoints } from '@/lib/tpoints';
import Link from 'next/link';
import { useActiveAccount } from 'thirdweb/react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [walletTotal, setWalletTotal] = useState(0);
  const account = useActiveAccount();

  useEffect(() => {
    async function fetchData() {
      const board = await getLeaderboard();
      setLeaderboard(board);
      if (account?.address) {
        const points = await getWalletTotalPoints(account.address);
        setWalletTotal(points);
      }
    }
    fetchData();
  }, [account?.address]);

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-6">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 border-4 border-[#F4A6B7]">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
          <img src="/brain-large.svg" alt="Brain" className="w-12 h-12 sm:w-16 sm:h-16" loading="eager" />
          <h1 className="text-2xl sm:text-4xl font-bold text-center text-[#2d1b2e]">
            Leaderboard
          </h1>
        </div>
        <p className="text-center text-[#5a3d5c] mb-4 sm:mb-6 text-sm sm:text-lg">
          Top wallets ranked by T points
        </p>

        {walletTotal > 0 && account?.address && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-[#FFE4EC] to-[#FFC4D1] rounded-lg border-2 border-[#F4A6B7] shadow-md">
            <div className="text-center">
              <div className="text-xs sm:text-sm text-[#5a3d5c] mb-1 font-semibold">Your Wallet T Points</div>
              <div className="text-2xl sm:text-3xl font-bold text-[#DC8291]">
                {walletTotal.toLocaleString()}
              </div>
              <div className="text-xs text-[#5a3d5c] mt-1 truncate">
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </div>
            </div>
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <img src="/brain-large.svg" alt="Brain" className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 opacity-50" loading="eager" />
            <p className="text-[#5a3d5c] text-base sm:text-lg mb-4">
              No scores yet. Be the first to complete a quiz!
            </p>
            <Link
              href="/"
              className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-4 px-8 rounded-lg text-base sm:text-lg transition inline-block shadow-lg min-h-[52px]"
            >
              Start Quiz
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b-2 border-[#F4A6B7]">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-[#2d1b2e] font-semibold text-xs sm:text-base">Rank</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-[#2d1b2e] font-semibold text-xs sm:text-base">Wallet Address</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-[#2d1b2e] font-semibold text-xs sm:text-base">T Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={index}
                      className={`border-b border-[#FFC4D1] active:bg-[#FFE4EC] transition ${
                        index < 3 ? 'bg-[#FFF0F5]' : ''
                      }`}
                    >
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        <div className="flex items-center">
                          <span className="font-semibold text-[#2d1b2e] text-xs sm:text-base">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        <span className="font-mono text-[#2d1b2e] text-xs sm:text-sm">
                          {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                        <span className="font-bold text-[#DC8291] text-xs sm:text-base">
                          {entry.tPoints.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 sm:mt-8 text-center">
              <Link
                href="/"
                className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-4 px-8 rounded-lg text-base sm:text-lg transition inline-block shadow-lg w-full sm:w-auto min-h-[52px]"
              >
                Play Quiz
              </Link>
            </div>
          </>
        )}

        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-[#FFE4EC] rounded-lg border-2 border-[#F4A6B7]">
          <h3 className="font-semibold text-[#2d1b2e] mb-2 flex items-center gap-2 text-sm sm:text-base">
            <img src="/brain-small.svg" alt="Brain" className="w-5 h-5 sm:w-6 sm:h-6" loading="lazy" />
            About T Points:
          </h3>
          <ul className="text-xs sm:text-sm text-[#5a3d5c] space-y-1 font-medium">
            <li>• Earn 1000 T points for each correct answer</li>
            <li>• Get 3 in a row for +500 bonus points</li>
            <li>• Get 5 in a row for +1000 bonus points</li>
            <li>• Perfect 10 in a row for +2000 bonus points!</li>
            <li>• T points will be used in this app</li>
            <li>• $ TRIV is the native token (coming soon)</li>
            <li className="font-bold text-[#DC8291]">• Top T point holders will receive HUGE Airdrops of $TRIV tokens!</li>
            <li className="text-xs italic">More details coming soon...</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
