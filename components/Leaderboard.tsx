'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';

/**
 * Leaderboard Component
 *
 * Props:
 *  - view: 'tpoints' | 'iq'  (defaults to 'tpoints')
 *
 * Behavior:
 *  - Fetches leaderboard entries from /api/debug/leaderboard (existing debug route in repo).
 *  - Batch-resolves Farcaster profiles via /api/neynar/user (if available).
 *  - Client-side pagination with page size options (10,25,50,100).
 *  - CSV export for current page or full sorted leaderboard.
 *
 * Notes:
 *  - For extremely large leaderboards, consider switching the fetch to a server-side paged endpoint
 *    (e.g., /api/leaderboard?page=&pageSize=) to avoid loading the entire dataset into the client.
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

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Derived values
  const pointsKey = view === 'iq' ? 'iqPoints' : 'tPoints';
  const totalEntries = leaderboard.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

  useEffect(() => {
    // ensure page valid after pageSize or leaderboard change
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, totalEntries]);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      try {
        // Current repo includes a debug route that returns entries: use that by default.
        // If you add a server-side paginated endpoint, swap this URL and pass page/pageSize.
        const res = await fetch('/api/debug/leaderboard');
        if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`);
        const json = await res.json();
        const entries: LeaderboardEntry[] = json.entries ?? json ?? [];
        if (!isMounted) return;
        setLeaderboard(entries);

        // Batch fetch Farcaster profiles (best-effort)
        const addresses = entries
          .map(e => (e.walletAddress || '').toLowerCase())
          .filter((a): a is string => Boolean(a));
        if (addresses.length > 0) {
          try {
            const profileResp = await fetch('/api/neynar/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ addresses }),
            });
            if (!profileResp.ok) throw new Error(`Profiles fetch failed: ${profileResp.status}`);
            const text = await profileResp.text();
            if (text) {
              const parsed = JSON.parse(text);
              setProfiles(prev => ({ ...prev, ...parsed.result }));
              setProfileErrors(parsed.errors || {});
            } else {
              setProfiles(prev => ({ ...prev }));
              setProfileErrors({});
            }
          } catch (err: unknown) {
            console.error('Profile resolution error', err);
            setProfiles(prev => ({ ...prev }));
            setProfileErrors({ api: String((err as Error)?.message || err) });
          }
        } else {
          setProfiles({});
          setProfileErrors({});
        }
      } catch (err) {
        console.error('Failed to load leaderboard', err);
        if (isMounted) {
          setLeaderboard([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [address, view]);

  const sorted = useMemo(() => {
    return leaderboard.slice().sort((a, b) => (b[pointsKey] || 0) - (a[pointsKey] || 0));
  }, [leaderboard, pointsKey]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totalPoints = useMemo(() => {
    return sorted.reduce((s, e) => s + (e?.tPoints || 0), 0);
  }, [sorted]);

  function downloadCsv(entries: LeaderboardEntry[], filename: string) {
    try {
      const header = ['rank', 'address', 'displayName', pointsKey];
      const rows = entries.map(e => {
        const addr = (e.walletAddress || '').toLowerCase();
        const displayName = profiles[addr]?.username || profiles[addr]?.ens || addr;
        const points = view === 'iq' ? (e.iqPoints || 0) : (e.tPoints || 0);
        const rank = sorted.indexOf(e) >= 0 ? sorted.indexOf(e) + 1 : '';
        return [String(rank), addr, displayName, String(points)];
      });
      const csv = [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed', err);
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
            <div className="ml-2 inline-flex gap-2">
              <button
                onClick={() => downloadCsv(paginated, `triviacast-leaderboard-page-${page}.csv`)}
                className="ml-2 bg-[#DC8291] hover:bg-[#C86D7D] text-white font-bold py-2 px-3 rounded-lg text-xs sm:text-sm transition inline-flex items-center justify-center shadow gap-2"
              >
                Export Page CSV
              </button>
              <button
                onClick={() => downloadCsv(sorted, `triviacast-leaderboard-all.csv`)}
                className="ml-2 bg-[#DC8291] hover:bg-[#C86D7D] text-white font-bold py-2 px-3 rounded-lg text-xs sm:text-sm transition inline-flex items-center justify-center shadow gap-2"
              >
                Export All CSV
              </button>
            </div>
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
          <>
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
                  {paginated.map((entry, idx) => {
                    const globalRank = (page - 1) * pageSize + idx + 1;
                    const addr = (entry.walletAddress || '').toLowerCase();
                    const displayName = profiles[addr]?.username || profiles[addr]?.ens || `${addr.slice(0, 6)}...${addr.slice(-4)}`;
                    const points = view === 'iq' ? (entry.iqPoints || 0) : (entry.tPoints || 0);

                    return (
                      <tr key={`${addr}-${globalRank}`} className="border-b border-[#fbecf0]">
                        <td className="py-2 align-top">{globalRank}</td>
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

            {/* Pagination controls */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-md bg-white border shadow-sm disabled:opacity-50"
                >
                  Prev
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(pn => {
                      if (totalPages <= 7) return true;
                      if (page <= 4) return pn <= 7;
                      if (page >= totalPages - 3) return pn >= totalPages - 6;
                      return Math.abs(pn - page) <= 3;
                    })
                    .map(pn => (
                      <button
                        key={pn}
                        onClick={() => setPage(pn)}
                        className={`px-2 py-1 rounded-md ${pn === page ? 'bg-[#DC8291] text-white' : 'bg-white border'} text-sm`}
                      >
                        {pn}
                      </button>
                    ))}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded-md bg-white border shadow-sm disabled:opacity-50"
                >
                  Next
                </button>

                <div className="ml-4 text-sm text-[#5a3d5c]">
                  Showing {Math.min(pageSize, totalEntries - (page - 1) * pageSize)} of {totalEntries} entries (page {page} of {totalPages})
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-[#5a3d5c]">Page size:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value) || 25;
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  className="px-2 py-1 border rounded-md"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div className="mt-6 text-center">
          <div className="text-sm text-[#5a3d5c]">Total T points: {totalPoints.toLocaleString()}</div>
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
