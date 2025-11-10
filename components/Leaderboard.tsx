'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { getLeaderboard, getIQPoints } from '@/lib/tpoints';

/**
 * Clean Leaderboard (no pagination)
 *
 * - Fetches leaderboard entries from lib/tpoints.getLeaderboard()
 * - If view === 'iq', augments entries with getIQPoints()
 * - Batch-resolves Farcaster profiles via /api/neynar/user
 * - Exports CSV for the full sorted leaderboard
 */

type LeaderboardEntry = {
  walletAddress?: string;
  tPoints?: number;
  iqPoints?: number;
  [k: string]: any;
};

export default function Leaderboard({ view = 'tpoints' }: { view?: 'tpoints' | 'iq' }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const { address } = useAccount();

  const totalTPoints = useMemo(() => {
    return leaderboard.reduce((sum, entry) => sum + (entry?.tPoints || 0), 0);
  }, [leaderboard]);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      try {
        const board = await getLeaderboard();
        // If user selected 'iq' view, fetch IQ points for each address (best-effort)
        if (view === 'iq') {
          const entries = await Promise.all(
            board.map(async (b: any) => {
              const addr = (b.walletAddress || '').toLowerCase();
              try {
                const v = await getIQPoints(addr as `0x${string}`);
                return { walletAddress: addr, iqPoints: Number(v) };
              } catch (err) {
                return { walletAddress: addr, iqPoints: 0 };
              }
            })
          );
          if (!isMounted) return;
          setLeaderboard(entries);
        } else {
          if (!isMounted) return;
          setLeaderboard(board);
        }

        // Batch fetch Farcaster profiles for leaderboard addresses
        const addresses = board.map((b: any) => b.walletAddress?.toLowerCase()).filter(Boolean);
        try {
          const response = await fetch('/api/neynar/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses }),
          });
          if (!response.ok) throw new Error('Failed to fetch profiles');
          const text = await response.text();
          if (!text) {
            setProfiles(prev => ({ ...prev }));
            setProfileErrors({});
          } else {
            const parsed = JSON.parse(text);
            setProfiles(prev => ({ ...prev, ...parsed.result }));
            setProfileErrors(parsed.errors || {});
          }
        } catch (err) {
          setProfiles(prev => ({ ...prev }));
          setProfileErrors({ api: String(err) });
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        if (isMounted) setLeaderboard([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [address, view]);

  // Sorted full leaderboard
  const pointsKey = view === 'iq' ? 'iqPoints' : 'tPoints';
  const sorted = useMemo(() => {
    return leaderboard.slice().sort((a, b) => (b[pointsKey] || 0) - (a[pointsKey] || 0));
  }, [leaderboard, pointsKey]);

  function exportCsvAll() {
    try {
      const header = ['rank', 'address', 'displayName', pointsKey];
      const rows = sorted.map((e, i) => {
        const addr = (e.walletAddress || '').toLowerCase();
        const displayName = profiles[addr]?.username || profiles[addr]?.ens || addr;
        const points = view === 'iq' ? (e.iqPoints || 0) : (e.tPoints || 0);
        return [String(i + 1), addr, displayName, String(points)];
      });
      const csv = [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `triviacast-leaderboard.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
      alert('Failed to export CSV');
    }
  }

  return (
    <div className="w-full px-0 sm:px-6">
      <div className="bg-white rounded-lg shadow-xl p-2 sm:p-6 border-4 border-[#F4A6B7] w-full max-w-full">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
          <Image src="/brain-large.svg" alt="Brain" width={64} height={64} priority />
          <h1 className="text-2xl sm:text-4xl font-bold text-center text-[#2d1b2e]">Leaderboard</h1>

          {sorted.length > 0 && (
            <button
              onClick={exportCsvAll}
              className="ml-2 bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-3 rounded-lg text-xs sm:text-sm transition inline-flex items-center justify-center shadow gap-2"
            >
              Export CSV
            </button>
          )}
        </div>

        <p className="text-center text-[#5a3d5c] mb-4 sm:mb-6 text-sm sm:text-lg">
          There are always some winners... 🥳🥇🏆<br />
          and some losers 😭😩😞
        </p>

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <Image src="/brain-large.svg" alt="Brain" width={80} height={80} className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 opacity-50 animate-pulse" priority />
            <p className="text-[#5a3d5c] text-base sm:text-lg">Loading leaderboard...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-[#5a3d5c]">No entries yet.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto w-full">
            <table className="min-w-[320px] w-full text-left table-auto">
              <thead>
                <tr className="text-xs sm:text-sm text-[#5a3d5c] border-b border-[#f3dbe0]">
                  <th className="py-2">#</th>
                  <th className="py-2">Player</th>
                  <th className="py-2">{view === 'iq' ? 'iQ' : 'T Points'}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, idx) => {
                  const rank = idx + 1;
                  const addr = (entry.walletAddress || '').toLowerCase();
                  const displayName = profiles[addr]?.username || profiles[addr]?.ens || `${addr.slice(0, 6)}...${addr.slice(-4)}`;
                  const points = view === 'iq' ? (entry.iqPoints || 0) : (entry.tPoints || 0);

                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

                  return (
                    <tr key={`${addr}-${rank}`} className="border-b border-[#fbecf0]">
                      <td className="py-2 align-top">
                        {medal ? <span className="mr-2">{medal}</span> : null}
                        {rank}
                      </td>
                      <td className="py-2 align-top">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-[#2d1b2e]">{displayName}</div>
                          {(profiles[addr]?.username || profiles[addr]?.ens) && (
                            <div className="text-xs text-[#7b636c]">{addr.slice(0, 6)}...{addr.slice(-4)}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 align-top">{points.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-center">
          <div className="text-sm text-[#5a3d5c]">Total T points: {totalTPoints.toLocaleString()}</div>
          <div className="mt-3 flex gap-3 justify-center">
            <Link href="/" className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-2 px-4 rounded-lg">
              Play Quiz
            </Link>
            <Link href="/info" className="bg-[#DC8291] hover:bg-[#C86D7D] text-white font-bold py-2 px-4 rounded-lg">
              Learn About T Points & $TRIV
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}