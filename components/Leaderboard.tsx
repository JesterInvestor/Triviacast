'use client';

import { useEffect, useState } from 'react';
import { LeaderboardEntry } from '@/types/quiz';
import { getLeaderboard, getUserTotalPoints } from '@/lib/tpoints';
import Link from 'next/link';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userTotal, setUserTotal] = useState(0);

  useEffect(() => {
    setLeaderboard(getLeaderboard());
    setUserTotal(getUserTotalPoints());
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-xl p-8 border-4 border-[#F4A6B7]">
        <div className="flex items-center justify-center gap-4 mb-2">
          <img src="/brain-large.svg" alt="Brain" className="w-16 h-16" />
          <h1 className="text-4xl font-bold text-center text-[#2d1b2e]">
            Leaderboard
          </h1>
        </div>
        <p className="text-center text-[#5a3d5c] mb-6 text-lg">
          Top players ranked by T points
        </p>

        {userTotal > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-[#FFE4EC] to-[#FFC4D1] rounded-lg border-2 border-[#F4A6B7] shadow-md">
            <div className="text-center">
              <div className="text-sm text-[#5a3d5c] mb-1 font-semibold">Your Total T Points</div>
              <div className="text-3xl font-bold text-[#DC8291]">
                {userTotal.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <img src="/brain-large.svg" alt="Brain" className="w-24 h-24 mx-auto mb-4 opacity-50" />
            <p className="text-[#5a3d5c] text-lg mb-4">
              No scores yet. Be the first to complete a quiz!
            </p>
            <Link
              href="/"
              className="bg-[#F4A6B7] hover:bg-[#E8949C] text-white font-bold py-3 px-8 rounded-lg text-lg transition inline-block shadow-lg"
            >
              Start Quiz
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#F4A6B7]">
                    <th className="text-left py-3 px-4 text-[#2d1b2e] font-semibold">Rank</th>
                    <th className="text-left py-3 px-4 text-[#2d1b2e] font-semibold">Player</th>
                    <th className="text-right py-3 px-4 text-[#2d1b2e] font-semibold">T Points</th>
                    <th className="text-right py-3 px-4 text-[#2d1b2e] font-semibold">Last Played</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={index}
                      className={`border-b border-[#FFC4D1] hover:bg-[#FFE4EC] transition ${
                        index < 3 ? 'bg-[#FFF0F5]' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                          {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                          {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                          <span className="font-semibold text-[#2d1b2e]">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#2d1b2e]">{entry.userName}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-[#DC8291]">
                          {entry.tPoints.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-[#5a3d5c]">
                        {formatDate(entry.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="bg-[#F4A6B7] hover:bg-[#E8949C] text-white font-bold py-3 px-8 rounded-lg text-lg transition inline-block shadow-lg"
              >
                Play Quiz
              </Link>
            </div>
          </>
        )}

        <div className="mt-8 p-4 bg-[#FFE4EC] rounded-lg border-2 border-[#F4A6B7]">
          <h3 className="font-semibold text-[#2d1b2e] mb-2 flex items-center gap-2">
            <img src="/brain-small.svg" alt="Brain" className="w-6 h-6" />
            About T Points:
          </h3>
          <ul className="text-sm text-[#5a3d5c] space-y-1 font-medium">
            <li>• Earn 1000 T points for each correct answer</li>
            <li>• Get 3 in a row for +500 bonus points</li>
            <li>• Get 5 in a row for +1000 bonus points</li>
            <li>• Perfect 10 in a row for +2000 bonus points!</li>
            <li>• T points will be used in this app</li>
            <li>• $ TRIV is the native token (coming soon)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
