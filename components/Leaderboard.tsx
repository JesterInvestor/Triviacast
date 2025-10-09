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
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-2 text-center text-gray-800">
          🏆 Leaderboard
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Top players ranked by T points
        </p>

        {userTotal > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Your Total T Points</div>
              <div className="text-3xl font-bold text-blue-600">
                {userTotal.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              No scores yet. Be the first to complete a quiz!
            </p>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition inline-block"
            >
              Start Quiz
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Rank</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Player</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">T Points</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Last Played</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${
                        index < 3 ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                          {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                          {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                          <span className="font-semibold text-gray-700">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-800">{entry.userName}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-amber-600">
                          {entry.tPoints.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-gray-500">
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition inline-block"
              >
                Play Quiz
              </Link>
            </div>
          </>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">About T Points:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
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
