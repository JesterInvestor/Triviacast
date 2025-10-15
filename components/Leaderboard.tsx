'use client';

import { useEffect, useMemo, useState } from 'react';
import { LeaderboardEntry } from '@/types/quiz';
import { getLeaderboard, getWalletTotalPoints } from '@/lib/tpoints';
import Link from 'next/link';
import { useActiveAccount } from 'thirdweb/react';
import { batchResolveDisplayNames } from '@/lib/addressResolver';
import * as Sentry from '@sentry/nextjs';
import { shareLeaderboardUrl, openShareUrl } from '@/lib/farcaster';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [displayNames, setDisplayNames] = useState<Map<string, string>>(new Map());
  const [updatingNames, setUpdatingNames] = useState(false);
  const [updatedCount, setUpdatedCount] = useState<number | null>(null);
  const [walletTotal, setWalletTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'chain' | 'none'>('none');
  const account = useActiveAccount();
  const myRank = useMemo(() => {
    if (!account?.address) return null;
    const idx = leaderboard.findIndex(l => l.walletAddress.toLowerCase() === account.address!.toLowerCase());
    return idx >= 0 ? idx + 1 : null;
  }, [account?.address, leaderboard]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const board = await getLeaderboard();
        setLeaderboard(board);
        setDataSource(board.length > 0 ? 'chain' : 'none');

        if (board.length > 0) {
          const addresses = board.map(entry => entry.walletAddress);
          const names = await batchResolveDisplayNames(addresses);
          setDisplayNames(prev => {
            const merged = new Map(prev);
            for (const [k, v] of names.entries()) {
              const existing = merged.get(k);
              const existingIsCanonical = existing && (existing.startsWith('@') || existing.includes('.eth'));
              const incomingIsCanonical = v && (v.startsWith('@') || v.includes('.eth'));
              if (!existing || !existingIsCanonical || incomingIsCanonical) {
                merged.set(k, v);
              }
            }
            return merged;
          });

          const unresolved = addresses.filter(a => !names.has(a.toLowerCase()));
          if (unresolved.length > 0) {
            setUpdatingNames(true);
            setUpdatedCount(null);
            Sentry.addBreadcrumb({ category: 'farcaster.poll', message: 'start polling unresolved names', level: 'info', data: { count: unresolved.length } });
            try {
              const { pollFarcasterUsernames } = await import('@/lib/addressResolver');
              const polled = await pollFarcasterUsernames(unresolved, 10, 1200, 1.5, 5000);
              if (polled && polled.size > 0) {
                setDisplayNames(prev => new Map([...Array.from(prev.entries()), ...Array.from(polled.entries())]));
                setUpdatedCount(polled.size);
                Sentry.addBreadcrumb({ category: 'farcaster.poll', message: 'polled and updated names', level: 'info', data: { updated: polled.size } });
              } else {
                setUpdatedCount(0);
                Sentry.addBreadcrumb({ category: 'farcaster.poll', message: 'poll completed with no updates', level: 'info' });
              }
            } catch (e) {
              setUpdatedCount(0);
              Sentry.captureException(e);
            } finally {
              setUpdatingNames(false);
              setTimeout(() => setUpdatedCount(null), 3000);
            }
          }
        }

        if (account?.address) {
          const points = await getWalletTotalPoints(account.address);
          setWalletTotal(points);
        }
      } finally {
        setLoading(false);
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
          There are always some winners... 🥳🥇🏆<br />
          and some losers 😭😩😞
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
              <div className="mt-3 flex items-center gap-2 justify-center flex-wrap">
                <button
                  onClick={() => openShareUrl(shareLeaderboardUrl(myRank, walletTotal))}
                  className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-4 rounded-lg text-sm transition inline-flex items-center justify-center shadow gap-2"
                >
                  <img src="/farcaster.svg" alt="Farcaster" className="w-4 h-4" />
                  Share on Farcaster
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <img src="/brain-large.svg" alt="Brain" className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 opacity-50 animate-pulse" loading="eager" />
            <p className="text-[#5a3d5c] text-base sm:text-lg">
              Loading leaderboard...
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <img src="/brain-large.svg" alt="Brain" className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 opacity-50" loading="eager" />
            <p className="text-[#5a3d5c] text-base sm:text-lg mb-4">
              No scores yet. Be the first to complete a quiz!
            </p>
            <Link
              href="/"
              className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-4 px-8 rounded-lg text-base sm:text-lg transition inline-block shadow-lg min-h-[52px] mx-auto"
            >
              Start Quiz
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 text-center text-[#5a3d5c] text-sm flex flex-col items-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {/* Five unique SVG icons */}
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <img
                    src="/https___i.imgur.com_84EvySZ.svg"
                    alt="Icon 1"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </span>
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <img
                    src="/https___i.imgur.com_MScXeOp.svg"
                    alt="Icon 2"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </span>
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <img
                    src="/anim=false,fit=contain,f=auto,w=288.svg"
                    alt="Icon 3"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </span>
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <img
                    src="/anim=false,fit=contain,f=auto,w=288 (1).svg"
                    alt="Icon 4"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </span>
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <img
                    src="/anim=false,fit=contain,f=auto,w=288 (2).svg"
                    alt="Icon 5"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </span>
              </div>
              <span>
                {leaderboard.length} active Triviacasters
                {process.env.NODE_ENV !== 'production' && (
                  <span className="ml-2 text-[10px] text-gray-400">[{dataSource}]</span>
                )}
              </span>
              {updatingNames && (
                <div className="mt-2 text-xs text-[#5a3d5c] italic">Updating display names…</div>
              )}
            </div>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b-2 border-[#F4A6B7]">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-[#2d1b2e] font-semibold text-xs sm:text-base">Rank</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-[#2d1b2e] font-semibold text-xs sm:text-base">Player</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-[#2d1b2e] font-semibold text-xs sm:text-base">T Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const resolved = displayNames.get(entry.walletAddress.toLowerCase()) || null;
                    const isTopThree = index < 3;
                    const shortened = `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`;
                    const farcasterOrEns = resolved && (resolved.startsWith('@') || resolved.includes('.eth')) ? resolved : null;

                    return (
                      <tr
                        key={entry.walletAddress}
                        className={`border-b border-[#FFC4D1] active:bg-[#FFE4EC] transition ${
                          isTopThree ? 'bg-[#FFF0F5]' : ''
                        }`}
                      >
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-2">
                            {isTopThree && index === 0 && <span>🥇</span>}
                            {isTopThree && index === 1 && <span>🥈</span>}
                            {isTopThree && index === 2 && <span>🥉</span>}
                            <span className="font-semibold text-[#2d1b2e] text-xs sm:text-base">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="flex flex-col">
                            {farcasterOrEns ? (
                              <>
                                <span className="text-[#2d1b2e] text-xs sm:text-sm font-semibold">
                                  {farcasterOrEns}
                                </span>
                                <span className="font-mono text-[#5a3d5c] text-xs opacity-70">
                                  {shortened}
                                </span>
                              </>
                            ) : (
                              <span className="text-[#2d1b2e] text-xs sm:text-sm font-mono">
                                {shortened}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                          <span className="font-bold text-[#DC8291] text-xs sm:text-base">
                            {entry.tPoints.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
          </ul>
          <h3 className="font-semibold text-[#2d1b2e] mb-2 mt-4 flex items-center gap-2 text-sm sm:text-base">
            <img src="/brain-small.svg" alt="Brain" className="w-5 h-5 sm:w-6 sm:h-6" loading="lazy" />
            About $TRIV
          </h3>
          <ul className="text-xs sm:text-sm text-[#5a3d5c] space-y-1 font-medium">
            <li>• $TRIV is the native token CA 0xa889A10126024F39A0ccae31D09C18095CB461B8</li>
            <li>• CLAIM $TRIV when prompted</li>
            <li className="font-bold text-[#DC8291]">• Top T point holders can claim HUGE Airdrops of $TRIV tokens daily!</li>
            <li className="text-xs italic">BUY $TRIV with swap</li>
            <li className="text-xs italic">Jackpot coming soon............ Users with 100,000 T points. So triviacast now!!!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}