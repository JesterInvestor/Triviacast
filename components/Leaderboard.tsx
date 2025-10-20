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
    OnchainKit.Avatar = (props: AvatarProps) => (
      <Image src={`/identicon-${(props.address || '').slice(2, 10)}.png`} alt="avatar" width={24} height={24} className={props.className} />
    );
    OnchainKit.Name = (props: NameProps) => (
      <span className={props.className}>{(props.address || '').slice(0, 8) + '...'}</span>
    );
  }
  // Added null checks before assigning display names
  if (OnchainKit.Avatar) {
    OnchainKit.Avatar.displayName = 'OnchainKitAvatar';
  }
  if (OnchainKit.Name) {
    OnchainKit.Name.displayName = 'OnchainKitName';
  }
}
import { pollFarcasterUsernames, resolveFarcasterProfile } from '@/lib/addressResolver';
import FarcasterLookup from './FarcasterLookup';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [walletTotal, setWalletTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const account = useActiveAccount();

  // MiniKit context for Farcaster info.
  // We dynamically import `useMiniKit` at runtime so that builds don't fail
  // when `@farcaster/auth-kit` isn't installed in the environment
  const [mfDisplayName, setMfDisplayName] = useState<string | undefined>(undefined);
  const [mfUsername, setMfUsername] = useState<string | undefined>(undefined);
  const [mfPfpUrl, setMfPfpUrl] = useState<string | undefined>(undefined);
  // Progressive Farcaster profile map: address (lowercase) -> { username, pfpUrl }
  const [farcasterProfiles, setFarcasterProfiles] = useState<Record<string, { username?: string; pfpUrl?: string }>>({});

  // Handler for manual Farcaster lookups (updates profile cache/state)
  const handleLookupResult = (address: string, profile: { username?: string; pfpUrl?: string } | null) => {
    const key = address.toLowerCase();
    if (profile) {
      setFarcasterProfiles((prev) => {
        const next = { ...prev, [key]: { username: profile.username?.replace(/^@/, ''), pfpUrl: profile.pfpUrl } };
        saveProfilesToCache(next);
        return next;
      });
      if (account?.address && account.address.toLowerCase() === key) {
        setMfUsername(profile.username?.replace(/^@/, ''));
        setMfPfpUrl(profile.pfpUrl);
      }
    } else {
      setFarcasterProfiles((prev) => {
        const copy = { ...prev };
        delete copy[key];
        saveProfilesToCache(copy);
        return copy;
      });
    }
  };

  // Simple concurrency runner: accepts array of async functions and runs up to `limit` in parallel
  async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit = 4) {
    const results: T[] = [];
    let i = 0;
    const workers: Promise<void>[] = [];
    const runOne = async () => {
      while (i < tasks.length) {
        const idx = i++;
        try {
          const res = await tasks[idx]();
          results[idx] = res as T;
        } catch (e) {
          results[idx] = undefined as unknown as T;
        }
      }
    };
    for (let w = 0; w < Math.min(limit, tasks.length); w++) {
      workers.push(runOne());
    }
    await Promise.all(workers);
    return results;
  }

  // Load cached profiles (client-only). Returns a map of address -> { username, pfpUrl }
  const loadCachedProfiles = (): Record<string, { username?: string; pfpUrl?: string; fetchedAt?: number }> => {
    try {
      const raw = localStorage.getItem('triviacast.farcasterProfiles.v1');
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, { username?: string; pfpUrl?: string; fetchedAt?: number }>;
      const now = Date.now();
      const valid: Record<string, { username?: string; pfpUrl?: string; fetchedAt?: number }> = {};
      for (const [addr, v] of Object.entries(parsed)) {
        if (!v || !v.fetchedAt) continue;
        if (now - v.fetchedAt <= 24 * 60 * 60 * 1000) {
          valid[addr] = v;
        }
      }
      return valid;
    } catch (e) {
      return {};
    }
  };

  const saveProfilesToCache = (updates: Record<string, { username?: string; pfpUrl?: string }>) => {
    try {
      const now = Date.now();
      const raw = localStorage.getItem('triviacast.farcasterProfiles.v1');
      const base = raw ? JSON.parse(raw) : {};
      for (const [k, v] of Object.entries(updates)) {
        base[k] = { ...(base[k] || {}), username: v.username, pfpUrl: v.pfpUrl, fetchedAt: now };
      }
      localStorage.setItem('triviacast.farcasterProfiles.v1', JSON.stringify(base));
    } catch (e) {
      // ignore storage errors
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadMiniAppContext() {
      try {
        // Try the miniapp SDK first (preferred)
        try {
          const mod = await import('@farcaster/miniapp-sdk');
          const sdk = mod?.sdk;
          if (sdk) {
            const inMiniApp = await sdk.isInMiniApp();
            if (inMiniApp) {
              const context = await sdk.context;
              if (!mounted) return;
              setMfDisplayName(context?.user?.displayName);
              setMfUsername(context?.user?.username);
              setMfPfpUrl(context?.user?.pfpUrl);
              return;
            }
          }
        } catch {
          // ignore and fall through to auth-kit attempt
        }

        // Fallback: try to load @farcaster/auth-kit which may export a hook or context
        try {
            // optional dynamic import for auth-kit; evaluate at runtime so bundler doesn't resolve it
            const mod = await (eval('import("@farcaster/auth-kit")') as Promise<any>);
          const modAny = mod as any;
          if (modAny) {
            // Some versions export `useMiniKit` hook, others may export a `MiniKit` object.
            if (typeof modAny.useMiniKit === 'function') {
              const { context } = modAny.useMiniKit();
              if (!mounted) return;
              setMfDisplayName(context?.user?.displayName);
              setMfUsername(context?.user?.username);
              setMfPfpUrl(context?.user?.pfpUrl);
              return;
            }

            // Try common named exports if present
            const exportedSdk = modAny.sdk || modAny.MiniKit || modAny.miniApp;
            if (exportedSdk) {
              const inMiniApp = await (exportedSdk.isInMiniApp ? exportedSdk.isInMiniApp() : false);
              if (inMiniApp) {
                const context = await (exportedSdk.context ? exportedSdk.context : undefined);
                if (!mounted) return;
                setMfDisplayName(context?.user?.displayName);
                setMfUsername(context?.user?.username);
                setMfPfpUrl(context?.user?.pfpUrl);
                return;
              }
            }
          }
        } catch {
          // ignore - neither SDKs available
        }
      } catch {
        // Ignore failures to load SDK in non-miniapp environments
      }
    }
    loadMiniAppContext();

    (async () => {
      try {
        if (account?.address) {
          const key = account.address.toLowerCase();
          // If we don't already have it, fetch a profile
          if (!farcasterProfiles[key]) {
            const prof = await resolveFarcasterProfile(key);
            if (prof) {
              setFarcasterProfiles((prev) => ({ ...prev, [key]: prof }));
            }
          }
        }
      } catch (_) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [account?.address, farcasterProfiles]); // Added missing dependencies

  const displayName = mfDisplayName;
  const username = mfUsername;
  const pfpUrl = mfPfpUrl; // profile picture

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

          // Progressive Farcaster profile discovery: start polling for usernames for all addresses on the board
          // We intentionally run this client-side and update UI as profiles appear.
          // Non-blocking polling strategy with cache + concurrency limits:
          // - Aggressive poll for newly-joined users (last N entries) with shorter delays.
          // - Background poll for the rest with more relaxed timing.
          // We intentionally don't await these so they run in the background and update UI as profiles arrive.
          (async () => {
            const allAddrs = board.map((b) => b.walletAddress.toLowerCase());
            // Load any cached profiles first and apply them immediately
            try {
              const cached = loadCachedProfiles();
              if (Object.keys(cached).length > 0) {
                const normalized: Record<string, { username?: string; pfpUrl?: string }> = {};
                for (const [k, v] of Object.entries(cached)) {
                  normalized[k.toLowerCase()] = { username: v.username, pfpUrl: v.pfpUrl };
                }
                setFarcasterProfiles((prev) => ({ ...normalized, ...prev }));
              }
            } catch (e) {
              // ignore cache load failures
            }
            const newlyJoinedCount = Math.min(10, allAddrs.length);
            const newlyJoined = allAddrs.slice(-newlyJoinedCount);
            const rest = allAddrs.filter((a) => !newlyJoined.includes(a));

            const runPollAndApply = async (addresses: string[], attempts: number, delayMs: number, backoff: number, maxDelay: number) => {
              try {
                const found = await pollFarcasterUsernames(addresses, attempts, delayMs, backoff, maxDelay);
                // For any addresses that reported a username, fetch fuller profile (pfp) and update immediately
                await Promise.all(Array.from(found.entries()).map(async ([addr, uname]) => {
                  try {
                    const prof = await resolveFarcasterProfile(addr);
                    const key = addr.toLowerCase();
                    setFarcasterProfiles((prev) => ({
                      ...prev,
                      [key]: {
                        username: prof?.username || uname,
                        pfpUrl: prof?.pfpUrl,
                      }
                    }));
                  } catch (e) {
                    // ignore per-address failures
                  }
                }));
              } catch (e) {
                console.debug('Farcaster polling batch failed', e);
              }
            };

            // Aggressive strategy for newly-joined users:
            // 1) Try an immediate direct profile fetch for each newly-joined address (fast, per-address).
            // 2) Run a tighter poll with more attempts and shorter delays.
            if (newlyJoined.length > 0) {
              // Immediate per-address attempts (concurrency-limited) with short retries
              const tasks = newlyJoined.map((addr) => async () => {
                const key = addr.toLowerCase();
                const maxTries = 3;
                const retryDelay = 300; // ms
                for (let t = 0; t < maxTries; t++) {
                  try {
                    const prof = await resolveFarcasterProfile(addr);
                    if (prof?.username || prof?.pfpUrl) {
                      const update = { [key]: { username: prof.username, pfpUrl: prof.pfpUrl } };
                      setFarcasterProfiles((prev) => ({ ...prev, ...update }));
                      saveProfilesToCache(update);
                      break; // success, stop retrying
                    }
                  } catch (e) {
                    // swallow and retry
                  }
                  // small delay between retries
                  await new Promise((r) => setTimeout(r, retryDelay));
                }
              });
              void runWithConcurrency(tasks, 6);

              // More aggressive polling parameters for newly joined users
              // Increase attempts and shorten delays so usernames/pfps appear faster
              void runPollAndApply(newlyJoined, 40, 200, 1.1, 1200);

              // external manual lookups will use the outer `handleLookupResult` defined above
            }

            // Background poll for the rest (non-blocking, slightly more frequent)
            if (rest.length > 0) {
              // Increase attempts and run a bit faster to discover more usernames/pfps
              void runPollAndApply(rest, 24, 600, 1.35, 3000);
            }
          })();

          // We now use OnchainKit Avatar and Name components for consistent identity rendering

        if (account?.address) {
          const points = await getWalletTotalPoints(account.address);
          setWalletTotal(points);
          // Trigger a manual lookup for the connected user so display name/pfp appear faster
          try {
            const profile = await resolveFarcasterProfile(account.address);
            if (profile) handleLookupResult(account.address, profile);
          } catch (_) {}
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
        {/* Manual lookup widget for admin/debug or user-supplied addresses */}
        <FarcasterLookup onResult={handleLookupResult} />
        <div className="mb-4 flex items-center justify-center">
          <div className="w-full max-w-md">
            <FarcasterLookup
              initialAddress={account?.address}
              onResult={(addr, profile) => {
                if (!addr) return;
                setFarcasterProfiles((prev) => ({ ...prev, [addr.toLowerCase()]: profile || {} }));
              }}
            />
          </div>
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
              {/* Farcaster profile info */}
              {pfpUrl && (
                <div className="flex justify-center items-center gap-2 mt-2">
                  <Image src={pfpUrl} alt="Profile" width={32} height={32} className="w-8 h-8 rounded-full border border-[#F4A6B7]" />
                  <span className="font-bold text-[#2d1b2e] text-sm">{displayName || username || 'User'}</span>
                  {username && (
                    <span className="text-xs text-[#5a3d5c]">@{username}</span>
                  )}
                </div>
              )}
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
            <div className="mb-4 text-center text-[#5a3d5c] text-sm flex flex-col items-center">
              <h2 className="text-lg sm:text-xl font-bold text-[#2d1b2e] mb-4">Top T Points Holders</h2>
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
                    {leaderboard.slice(0, 5).map((entry, index) => (
                      <tr
                        key={entry.walletAddress}
                        className={`border-b border-[#FFC4D1] active:bg-[#FFE4EC] transition ${index < 3 ? 'bg-[#FFF0F5]' : ''}`}
                      >
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-2">
                            {index === 0 && <span>🥇</span>}
                            {index === 1 && <span>🥈</span>}
                            {index === 2 && <span>🥉</span>}
                            <span className="font-semibold text-[#2d1b2e] text-xs sm:text-base">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-2">
                            {farcasterProfiles[entry.walletAddress.toLowerCase()]?.pfpUrl ? (
                              <Image src={farcasterProfiles[entry.walletAddress.toLowerCase()]?.pfpUrl || ''} alt="pfp" width={24} height={24} className="rounded-full border border-[#F4A6B7]" />
                            ) : (
                              (() => {
                                const AvatarComp = OnchainKit.Avatar as unknown as React.ComponentType<any> | null;
                                if (AvatarComp) {
                                  return <AvatarComp address={entry.walletAddress} chain={base} className="w-6 h-6 rounded-full border border-[#F4A6B7]" />;
                                }
                                return <Image src={`/identicon-${entry.walletAddress.slice(2, 10)}.png`} alt="pfp" width={24} height={24} className="rounded-full border border-[#F4A6B7]" />;
                              })()
                            )}
                            <div className="flex flex-col">
                              <span className="text-[#2d1b2e] text-xs sm:text-sm font-semibold">{farcasterProfiles[entry.walletAddress.toLowerCase()]?.username || entry.walletAddress.slice(0, 8) + '...'}</span>
                            </div>
                          </div>
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
            </div>
            <div className="mb-4 text-center text-[#5a3d5c] text-sm flex flex-col items-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {/* Five unique SVG icons */}
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <Image src="/https___i.imgur.com_84EvySZ.svg" alt="Icon 1" width={28} height={28} className="object-contain" />
                </span>
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <Image src="/https___i.imgur.com_MScXeOp.svg" alt="Icon 2" width={28} height={28} className="object-contain" />
                </span>
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <Image src="/anim=false,fit=contain,f=auto,w=288.svg" alt="Icon 3" width={28} height={28} className="object-contain" />
                </span>
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <Image src="/anim=false,fit=contain,f=auto,w=288 (1).svg" alt="Icon 4" width={28} height={28} className="object-contain" />
                </span>
                <span className="rounded-full bg-white border-2 border-[#F4A6B7] shadow w-7 h-7 flex items-center justify-center">
                  <Image src="/anim=false,fit=contain,f=auto,w=288 (2).svg" alt="Icon 5" width={28} height={28} className="object-contain" />
                </span>
              </div>
              <span>
                {leaderboard.length} active Triviacasters
              </span>
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
                    // Use MiniKit context for all leaderboard entries
                    // If you want to show other users, you might need to fetch their profile info separately
                    const isCurrentUser = account?.address?.toLowerCase() === entry.walletAddress.toLowerCase();
                    return (
                      <tr
                        key={entry.walletAddress}
                        className={`border-b border-[#FFC4D1] active:bg-[#FFE4EC] transition ${index < 3 ? 'bg-[#FFF0F5]' : ''}`}
                      >
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-2">
                            {index === 0 && <span>🥇</span>}
                            {index === 1 && <span>🥈</span>}
                            {index === 2 && <span>🥉</span>}
                            <span className="font-semibold text-[#2d1b2e] text-xs sm:text-base">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-2">
                            {/* Show pfp, displayName, username for current user */}
                            {isCurrentUser && pfpUrl && (
                              <Image src={pfpUrl} alt="Profile" width={32} height={32} className="w-8 h-8 rounded-full border border-[#F4A6B7]" />
                            )}
                            <div className="flex flex-col">
                                {/* Use OnchainKit Avatar/Name for all users; show MiniApp profile details for connected user if available */}
                                <div className="flex items-center gap-2">
                                  {/* Prefer Farcaster pfp if discovered */}
                                  {farcasterProfiles[entry.walletAddress.toLowerCase()]?.pfpUrl ? (
                                    <Image src={farcasterProfiles[entry.walletAddress.toLowerCase()]?.pfpUrl || ''} alt="pfp" width={24} height={24} className="rounded-full border border-[#F4A6B7]" />
                                  ) : (
                                    // Use dynamically loaded OnchainKit Avatar or fallback
                                    (() => {
                                      const AvatarComp = OnchainKit.Avatar as unknown as React.ComponentType<any> | null;
                                      if (AvatarComp) {
                                        return <AvatarComp address={entry.walletAddress} chain={base} className="w-6 h-6 rounded-full border border-[#F4A6B7]" />;
                                      }
                                      return <Image src={`/identicon-${entry.walletAddress.slice(2, 10)}.png`} alt="pfp" width={24} height={24} className="rounded-full border border-[#F4A6B7]" />;
                                    })()
                                  )}

                                  {isCurrentUser ? (
                                    <div className="flex flex-col">
                                      <span className="text-[#2d1b2e] text-xs sm:text-sm font-semibold">{displayName || username || farcasterProfiles[entry.walletAddress.toLowerCase()]?.username || 'User'}</span>
                                      {(username || farcasterProfiles[entry.walletAddress.toLowerCase()]?.username) && (
                                        <span className="font-mono text-[#5a3d5c] text-xs opacity-70">{`@${(username ?? farcasterProfiles[entry.walletAddress.toLowerCase()]?.username ?? '').replace(/^@/, '')}`}</span>
                                      )}
                                    </div>
                                  ) : (
                                    // If the farcaster username was found, show it; otherwise render the OnchainKit Name component
                                    farcasterProfiles[entry.walletAddress.toLowerCase()]?.username ? (
                                      <div className="flex flex-col">
                                        <span className="text-[#2d1b2e] text-xs sm:text-sm font-semibold">{farcasterProfiles[entry.walletAddress.toLowerCase()]?.username}</span>
                                      </div>
                                    ) : (
                                      (() => {
                                        const NameComp = OnchainKit.Name as unknown as React.ComponentType<any> | null;
                                        if (NameComp) {
                                          return <NameComp address={entry.walletAddress} chain={base} className="" />;
                                        }
                                        return <span className="text-xs">{entry.walletAddress.slice(0, 8)}...</span>;
                                      })()
                                    )
                                  )}
                                </div>
                            </div>
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