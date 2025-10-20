'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { LeaderboardEntry } from '@/types/quiz';
import { getLeaderboard, getWalletTotalPoints } from '@/lib/tpoints';
import Link from 'next/link';
import { useActiveAccount } from 'thirdweb/react';

import { shareLeaderboardUrl, openShareUrl } from '@/lib/farcaster';
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

// Minimal client-side component to fetch a single Farcaster profile by wallet address
function FarcasterProfile({ address, fallbackAddress }: { address: string; fallbackAddress: string }) {
  // client-only fetch
  const [profile, setProfile] = useState<{ displayName?: string; username?: string; pfp?: { url?: string } | null } | null>(null);
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/neynar/user?address=${encodeURIComponent(address)}`);
        if (!mounted) return;
        if (!res.ok) return setProfile(null);
        const json = await res.json();
        if (!mounted) return;
        setProfile(json?.result ?? null);
      } catch (e) {
        if (!mounted) return;
        setProfile(null);
      }
    }
    // Fire once on mount
    void load();
    return () => { mounted = false; };
  }, [address]);

  if (!profile) {
    // show compact address while loading or when no profile found
    return <span className="font-bold text-sm text-[#2d1b2e]">{fallbackAddress.slice(0, 6) + '...' + fallbackAddress.slice(-4)}</span>;
  }

  const pfpUrl = profile.pfp?.url ?? null;
  const display = profile.displayName || profile.username || (fallbackAddress.slice(0, 6) + '...' + fallbackAddress.slice(-4));

  return (
    <div className="flex items-center gap-2">
      {pfpUrl ? (
        // next/image requires a static src or remote domains configured; prefer native img tag here for simplicity
        // small inline img keeps bundle minimal and avoids needing next.config changes
        // eslint-disable-next-line @next/next/no-img-element
        // Using img tag avoids needing external image domains in next.config
        <img src={pfpUrl} alt="pfp" className="w-8 h-8 rounded-full object-cover" />
      ) : null}
      <div className="flex flex-col">
        <span className="font-bold text-sm text-[#2d1b2e]">{display}</span>
        {profile.username ? <span className="text-xs text-[#5a3d5c]">@{profile.username}</span> : null}
      </div>
    </div>
  );
}
// Farcaster lookup logic removed

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [walletTotal, setWalletTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const account = useActiveAccount();

  // Farcaster lookup logic removed — leaderboard shows wallet addresses only

  // Farcaster context and lookup removed; nothing to do here

  // No Farcaster miniapp profile data available when lookup is removed

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

          // We now use OnchainKit Avatar and Name components for consistent identity rendering

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
          <Image src="/brain-large.svg" alt="Brain" width={64} height={64} priority />
          <h1 className="text-2xl sm:text-4xl font-bold text-center text-[#2d1b2e]">
            Leaderboard
          </h1>
        </div>
        {/* Address lookup removed per request */}
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
              {/* Profile UI removed */}
              <div className="mt-3 flex items-center gap-2 justify-center flex-wrap">
                <button
                  onClick={() => openShareUrl(shareLeaderboardUrl(myRank, walletTotal))}
                  className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-4 rounded-lg text-sm transition inline-flex items-center justify-center shadow gap-2"
                >
                  <Image src="/farcaster.svg" alt="Farcaster" width={16} height={16} className="w-4 h-4" />
                  Share on Farcaster
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <Image src="/brain-large.svg" alt="Brain" width={80} height={80} className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 opacity-50 animate-pulse" priority />
            <p className="text-[#5a3d5c] text-base sm:text-lg">
              Loading leaderboard...
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
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

        {leaderboard.length > 0 && (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left table-auto">
                <thead>
                  <tr className="text-xs sm:text-sm text-[#5a3d5c] border-b border-[#f3dbe0]">
                    <th className="py-2">#</th>
                    <th className="py-2">Player</th>
                    <th className="py-2">T Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard
                    .slice()
                    .sort((a, b) => b.tPoints - a.tPoints)
                    .map((entry, i) => {
                      const rank = i + 1;
                      const addr = entry.walletAddress || '';
                      const Avatar = OnchainKit.Avatar;
                      const Name = OnchainKit.Name;
                      return (
                        <tr key={addr} className="border-b border-[#f8e8eb]">
                          <td className="py-3 align-middle w-12 font-semibold text-sm text-[#2d1b2e]">{rank}</td>
                          <td className="py-3 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden">
                                {Avatar ? (
                                  <Avatar address={addr} className="w-8 h-8 rounded-full" chain={base} />
                                ) : (
                                  <Image
                                    src={`/identicon-${(addr || '').slice(2, 10)}.png`}
                                    alt="avatar"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full"
                                  />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <FarcasterProfile address={addr} fallbackAddress={addr} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 align-middle font-bold text-[#DC8291] text-sm">{entry.tPoints.toLocaleString()}</td>
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
            <Image src="/brain-small.svg" alt="Brain" width={24} height={24} />
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
            <Image src="/brain-small.svg" alt="Brain" width={24} height={24} />
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

// Ensure OnchainKit is attempted on client mount
if (typeof window !== 'undefined') {
  // Fire-and-forget
  void ensureOnchainKit();
}