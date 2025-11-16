'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { LeaderboardEntry } from '@/types/quiz';
import { getLeaderboard, getWalletTotalPoints } from '@/lib/tpoints';
import { getIQPoints } from '@/lib/iq';
import Link from 'next/link';
import { useAccount } from 'wagmi';

// shareLeaderboardUrl/openShareUrl removed — wallet badge removed from leaderboard
import { base } from 'viem/chains';
// Avatar/Name from @coinbase/onchainkit/identity are optional at build time.
// We'll load them dynamically at runtime and provide fallbacks.
type AvatarProps = { address?: string; className?: string; chain?: unknown };
type NameProps = { address?: string; className?: string; chain?: unknown };
const OnchainKit: {
  Avatar: React.ComponentType<AvatarProps> | null;
  Name: React.ComponentType<NameProps> | null;
} = { Avatar: null, Name: null };
async function ensureOnchainKit() {
  try {
    // Use eval import to prevent bundlers from resolving this optional package at build time
    const mod = await (eval('import("@coinbase/onchainkit/identity")') as Promise<unknown>);
    const modAny = mod as any;
    OnchainKit.Avatar = modAny?.Avatar ?? null;
    OnchainKit.Name = modAny?.Name ?? null;
  } catch {
    function OnchainKitAvatar(props: AvatarProps) {
      return (
        <Image
          src={`/identicon-${(props.address || '').slice(2, 10)}.png`}
          alt="avatar"
          width={24}
          height={24}
          className={props.className}
        />
      );
    }

    function OnchainKitName(props: NameProps) {
      return <span className={props.className}>{(props.address || '').slice(0, 8) + '...'}</span>;
    }

    OnchainKitAvatar.displayName = 'OnchainKitAvatar';
    OnchainKitName.displayName = 'OnchainKitName';

    OnchainKit.Avatar = OnchainKitAvatar;
    OnchainKit.Name = OnchainKitName;
  }
}

function ProfileDisplay({ profile, fallbackAddress }: { profile?: { displayName?: string; username?: string; avatarImgUrl?: string; pfpUrl?: string; pfp_url?: string; avatar?: string; fid?: number; bio?: string; followers?: number; following?: number; custody_address?: string; verified_addresses?: any; raw?: any }, fallbackAddress?: string }) {
  // Use avatar from profile if available, else fallback to stamp
  const avatarUrl =
    profile?.avatarImgUrl || profile?.pfpUrl || profile?.pfp_url || profile?.avatar ||
    (fallbackAddress ? `https://cdn.stamp.fyi/avatar/${fallbackAddress}?s=32` : undefined);
  const display = profile?.username || profile?.displayName || "Get on Facaster bro";
  return (
    <div className="flex items-center gap-2">
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="avatar" className="rounded-full w-8 h-8" />
      )}
      <span className="font-bold text-[#2d1b2e] text-base sm:text-lg">{display}</span>
      {profile?.fid && (
        <span className="ml-2 text-xs text-gray-400">FID: {profile.fid}</span>
      )}
    </div>
  );
}
// Farcaster profile display logic

export default function Leaderboard({ view = 'tpoints' }: { view?: 'tpoints' | 'iq' }) {
  const ITEMS_PER_PAGE = 20;

  const [leaderboard, setLeaderboard] = useState<Array<any>>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const lastScrollCheckRef = useRef<number>(0);

  const totalTPoints = useMemo(() => {
    return leaderboard.reduce((sum, entry) => sum + (entry?.tPoints || 0), 0);
  }, [leaderboard]);

  // Sorted leaderboard memoized so we can paginate the sorted list consistently
  const sortedLeaderboard = useMemo(() => {
    return leaderboard
      .slice()
      .sort((a, b) => {
        const aPoints = view === 'iq' ? (a.iqPoints || 0) : (a.tPoints || 0);
        const bPoints = view === 'iq' ? (b.iqPoints || 0) : (b.tPoints || 0);
        return bPoints - aPoints;
      });
  }, [leaderboard, view]);

  // Limit to top 100 entries only (user request)
  const MAX_DISPLAY = 100;
  const limitedLeaderboard = useMemo(() => sortedLeaderboard.slice(0, MAX_DISPLAY), [sortedLeaderboard]);

  // Reset displayCount when leaderboard or view change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [limitedLeaderboard, view]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const board = await getLeaderboard();
        // board contains walletAddress and tPoints; for IQ view we'll augment with iqPoints
        if (view === 'iq') {
          // Fetch IQ points for each address in parallel (best-effort)
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
          setLeaderboard(entries);
        } else {
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
          const data = await response.text();
          if (!data) {
            setProfiles(prev => ({ ...prev }));
            setProfileErrors({});
          } else {
            const parsed = JSON.parse(data);
            setProfiles(prev => ({ ...prev, ...parsed.result }));
            setProfileErrors(parsed.errors || {});
          }
        } catch (err) {
          setProfiles(prev => ({ ...prev }));
          setProfileErrors({ api: String(err) });
        }

        // walletTotal badge removed — no per-wallet fetch here
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [address, view]);

  // loadMore callback used by both IntersectionObserver and scroll fallback
  const loadMore = useCallback(() => {
    if (displayCount >= limitedLeaderboard.length || isFetchingMore) return;
    setIsFetchingMore(true);
    // small timeout to allow UI feedback and avoid extremely fast repeated increments
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, limitedLeaderboard.length));
      setIsFetchingMore(false);
    }, 250);
  }, [displayCount, limitedLeaderboard.length, isFetchingMore]);

  // IntersectionObserver for infinite scroll (works in desktop and modern mobile browsers)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMore();
          }
        });
      },
      {
        root: null,
        rootMargin: '400px', // larger margin to prefetch earlier on mobile
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [sentinelRef.current, loadMore]);

  // Scroll/touch fallback for environments (webviews / older mobile browsers) where IntersectionObserver doesn't reliably fire
  useEffect(() => {
    const handler = () => {
      // throttle checks to ~250ms
      const now = Date.now();
      if (now - lastScrollCheckRef.current < 250) return;
      lastScrollCheckRef.current = now;

      // don't try to load if already fetching or nothing left to load
  if (isFetchingMore || displayCount >= limitedLeaderboard.length) return;

      // check if we're near the bottom of the page
      const scrollY = window.scrollY || window.pageYOffset;
      const viewportHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const threshold = 200; // px from bottom to trigger
      if (viewportHeight + scrollY >= fullHeight - threshold) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('touchmove', handler, { passive: true });
    // also check once on mount in case content is short
    handler();

    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('touchmove', handler);
    };
  }, [displayCount, limitedLeaderboard.length, isFetchingMore, loadMore]);

  return (
    <div className="w-full px-0 sm:px-6">
      <div className="bg-white rounded-lg shadow-xl p-2 sm:p-6 border-4 border-[#F4A6B7] w-full max-w-full">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
          <Image src="/brain-large.svg" alt="Brain" width={64} height={64} priority />
          <h1 className="text-2xl sm:text-4xl font-bold text-center text-[#2d1b2e]">
            Leaderboard
          </h1>
          {limitedLeaderboard.length > 0 && (
            <div className="ml-2 flex flex-col items-center justify-center">
              <div className="px-2 py-1 rounded-lg bg-[#FFE4EC] border border-[#F4A6B7] text-[10px] sm:text-xs font-semibold text-[#5a3d5c] tracking-wide">
                Total Players
              </div>
              <div className="mt-1 text-lg sm:text-xl font-extrabold text-[#DC8291] drop-shadow-sm">
                {leaderboard.length.toLocaleString()}
              </div>
            </div>
          )}
          {/* Export CSV of usernames -> addresses */}
          {sortedLeaderboard.length > 0 && (
            <button
              onClick={() => {
                try {
                  const pointsKey = view === 'iq' ? 'iqPoints' : 'tPoints';
                  const sorted = sortedLeaderboard;
                  const rows: string[] = [];
                  const header = [
                    'rank',
                    'address',
                    view === 'iq' ? 'iq_points' : 't_points',
                    'farcaster_username',
                    'display_name',
                    'fid',
                    'custody_address',
                    'verified_eth_addresses',
                  ];
                  rows.push(header.join(','));
                  sorted.forEach((entry, idx) => {
                    const addr = (entry.walletAddress || '').toLowerCase();
                    let profile: any = profiles[addr];
                    if (!profile) {
                      profile = Object.values(profiles).find(
                        (p: any) => p?.custody_address?.toLowerCase() === addr
                      );
                    }
                    if (!profile) {
                      profile = Object.values(profiles).find((p: any) => {
                        const verified = [
                          ...(p?.verified_addresses?.eth_addresses || []),
                          ...(p?.verified_addresses?.sol_addresses || []),
                        ].map((a: string) => a.toLowerCase());
                        return verified.includes(addr);
                      });
                    }
                    const username = profile?.username ?? '';
                    const displayName = profile?.display_name ?? profile?.displayName ?? '';
                    const fid = profile?.fid ?? '';
                    const custody = (profile?.custody_address || '').toLowerCase();
                    const verifiedEth: string[] = (profile?.verified_addresses?.eth_addresses || []).map((x: string) => x.toLowerCase());
                    const csvRow = [
                      String(idx + 1),
                      addr,
                      String(entry[pointsKey] || 0),
                      username,
                      displayName,
                      String(fid),
                      custody,
                      `"${verifiedEth.join(' ')}"`,
                    ];
                    rows.push(csvRow.join(','));
                  });
                  const csv = rows.join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `triviacast-leaderboard-addresses.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.error('CSV export failed', e);
                  alert('Failed to export CSV');
                }
              }}
              className="ml-2 bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-3 rounded-lg text-xs sm:text-sm transition inline-flex items-center justify-center shadow"
            >
              Export CSV
            </button>
          )}
        </div>
        {/* Address lookup removed per request */}
        <p className="text-center text-[#5a3d5c] mb-4 sm:mb-6 text-sm sm:text-lg">
          There are always some winners... 🥳🥇🏆<br />
          and some losers 😭😩😞
        </p>

        {/* Wallet badge removed from leaderboard page per request */}

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <Image src="/brain-large.svg" alt="Brain" width={80} height={80} className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 opacity-50 animate-pulse" priority />
            <p className="text-[#5a3d5c] text-base sm:text-lg">
              Loading leaderboard...
            </p>
          </div>
        ) : sortedLeaderboard.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Image src="/brain-large.svg" alt="Brain" width={80} height={80} className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 opacity-50" priority />
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
        ) : null}

          {limitedLeaderboard.length > 0 && (
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
                  {limitedLeaderboard
                    .slice(0, displayCount)
                    .map((entry, i) => {
                      const rank = i + 1;
                      // Always normalize address for lookup
                      const addr = (entry.walletAddress || '').toLowerCase();
                      let profile = profiles[addr];
                      // Try custody address match
                      if (!profile) {
                        profile = Object.values(profiles).find(
                          (p: any) => p?.custody_address?.toLowerCase() === addr
                        );
                      }
                      // Try verified addresses match
                      if (!profile) {
                        profile = Object.values(profiles).find((p: any) => {
                          const verified = [
                            ...(p?.verified_addresses?.eth_addresses || []),
                            ...(p?.verified_addresses?.sol_addresses || [])
                          ].map((a: string) => a.toLowerCase());
                          return verified.includes(addr);
                        });
                      }
                      return (
                        <tr key={`${addr}-${i}`} className="border-b border-[#f8e8eb]">
                          <td className="py-3 align-middle w-12 font-semibold text-sm text-[#2d1b2e]">{rank}</td>
                          <td className="py-3 align-middle">
                            <div className="flex items-center gap-3">
                              <ProfileDisplay profile={profile} fallbackAddress={addr} />
                              {/* Show error if no profile found and error exists for this address */}
                              {!profile && profileErrors && (profileErrors[addr] || profileErrors['all']) && (
                                <span className="text-xs text-red-500 ml-2">{profileErrors[addr] || profileErrors['all']}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 align-middle font-bold text-[#DC8291] text-sm">{(view === 'iq' ? (entry.iqPoints || 0) : (entry.tPoints || 0)).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {/* Sentinel element observed by IntersectionObserver to trigger loading more */}
              {/* give it a small height so some mobile browsers can detect intersection */}
              <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
            </div>

            {/* show a small loader or message when fetching more */}
            {displayCount < limitedLeaderboard.length && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 text-sm text-[#5a3d5c]">
                  <svg className="animate-spin h-5 w-5 text-[#DC8291]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span>{isFetchingMore ? 'Loading more...' : 'Scroll to load more'}</span>
                </div>
              </div>
            )}

            {/* Total T Points summary */}
            <div className="mt-6 sm:mt-8 text-center w-full">
              <div className="bg-[#FFF4F6] border-2 border-[#F4A6B7] rounded-lg p-3 sm:p-4 mb-4 inline-block w-full">
                <div className="text-sm text-[#5a3d5c]">{view === 'iq' ? 'Total iQ (all players)' : 'Total T Points (all players)'}</div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#DC8291]">{(view === 'iq' ? leaderboard.reduce((s, e) => s + (e.iqPoints || 0), 0) : totalTPoints).toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-2 sm:mt-0 text-center flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/"
                className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-4 px-8 rounded-lg text-base sm:text-lg transition inline-block shadow-lg w-full sm:w-auto min-h-[52px]"
              >
                Play Quiz
              </Link>
              <Link
                href="/info"
                className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-4 px-8 rounded-lg text-base sm:text-lg transition inline-block shadow-lg w-full sm:w-auto min-h-[52px]"
              >
                Learn About T Points & $TRIV
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Ensure OnchainKit is attempted on client mount
if (typeof window !== 'undefined') {
  // Fire-and-forget
  void ensureOnchainKit();
}
