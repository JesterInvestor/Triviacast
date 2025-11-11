"use client";

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useIQPoints } from '@/lib/hooks/useIQPoints';
import WalletIQPoints from '@/components/WalletIQPoints';
import { useQuestIQ } from '@/lib/hooks/useQuestIQ';
import { shareAppUrl, openShareUrl } from '@/lib/farcaster';
// Gating reads removed (we no longer rely on backend relayer to mark quiz/friend searches)
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  markShareDone,
  markFollowDone,
  isShareMarkedToday,
  isFollowMarkedToday,
} from '@/lib/questsClient';
// Leaderboard removed from quests page (moved to its own page with toggle)
// import Link from 'next/link';
import { base } from 'wagmi/chains';

// Minimal client-side flag: set localStorage 'triviacast:lastQuizCompletedDay' when quiz finishes.
// We'll read it here to decide if Daily Quiz Play claim is enabled.

// Removed on-chain day marker hooks; quiz & challenge quests disabled without relayer.

interface QuestCardProps {
  title: string; emoji: string; description: string; reward: string; claimed: boolean; disabled: boolean; onClaim: ()=>void; loading: boolean;
}

function QuestCard({ title, emoji, description, reward, claimed, disabled, onClaim, loading }: QuestCardProps) {
  return (
    <div className="p-4 sm:p-5 bg-white rounded-lg border-4 border-[#F4A6B7] shadow relative overflow-hidden">
      <div className="flex items-start gap-3">
        <div className="text-3xl sm:text-4xl leading-none drop-shadow-sm">{emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#2d1b2e]">{title}</h2>
            <span className="px-2 py-1 bg-[#FFE4EC] border border-[#F4A6B7] rounded text-xs font-semibold text-[#5a3d5c]">{reward}</span>
          </div>
          <p className="text-sm text-[#5a3d5c] mb-3 leading-relaxed">{description}</p>
          <div className="flex items-center gap-3">
            {claimed ? (
              <div className="text-green-700 text-sm font-semibold">✅ Claimed</div>
            ) : (
              <button
                disabled={disabled || loading}
                onClick={() => !disabled && onClaim()}
                className={`px-4 py-2 rounded-lg text-sm font-bold shadow transition min-w-[120px] ${disabled || loading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#DC8291] hover:bg-[#c96a78] text-white'}`}
              >
                {loading ? 'Processing…' : 'Claim'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuestsPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, switchChainAsync, isPending: switchingChain, error: switchError } = useSwitchChain();
  const isOnBase = chainId === base.id;
  const chainLabel = useMemo(() => {
    if (!chainId) return 'Unknown';
    if (chainId === base.id) return `Base mainnet (${base.id})`;
    return `Chain ${chainId}`;
  }, [chainId]);
  const { iqPoints } = useIQPoints(address as `0x${string}` | undefined);
  // Always require Base network for direct on-chain user claims (no gasless backend).
  const requiresBase = true;
  const [inlineError, setInlineError] = useState<string | null>(null);
  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: string }>>([]);
  const showToast = useCallback((message: string, type = 'info') => {
    const id = Date.now() + Math.round(Math.random()*1000);
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);
  // Small ephemeral UI bursts when user presses Cast/Follow
  const [castBurst, setCastBurst] = useState(false);
  const [followBurst, setFollowBurst] = useState(false);
  const {
    claimedFollowJester,
    claimFollowJester,
    claimedShare,
    claimShare,
    claimedOneIQ,
    claimDailyOneIQ,
    loading,
    error,
    secondsUntilReset,
  } = useQuestIQ(address as `0x${string}` | undefined);

  // --- Follow status check (hide Follow quest if user already follows target fid) ---
  const TARGET_FID = 1175506; // @jesterinvestor
  // CAP: users with >= 52 iQ must NOT be able to claim the +50 follow reward
  const FOLLOW_IQ_CAP = 52;
  const [checkingFollow, setCheckingFollow] = useState(false);
  const [alreadyFollowingJester, setAlreadyFollowingJester] = useState<boolean | null>(null);
  useEffect(() => {
    let ignore = false;
    async function run() {
      setAlreadyFollowingJester(null);
      if (!address) return;
      setCheckingFollow(true);
      try {
        const res = await fetch(`/api/friends?address=${address}`);
        const data = await res.json().catch(() => ({}));
        // Normalize potential arrays in response
        const arrays: any[] = [];
        if (Array.isArray(data)) arrays.push(data);
        if (Array.isArray(data.follows)) arrays.push(data.follows);
        if (Array.isArray(data.following)) arrays.push(data.following);
        if (Array.isArray(data.result?.follows)) arrays.push(data.result.follows);
        if (Array.isArray(data.result?.following)) arrays.push(data.result.following);
        const flat = arrays.flat().filter(Boolean);
        const found = flat.some((entry: any) => {
          const fidVal = entry?.fid ?? entry?.targetFid ?? entry?.userFid ?? entry?.user?.fid;
          const n = typeof fidVal === 'string' ? parseInt(fidVal, 10) : fidVal;
          return Number(n) === TARGET_FID;
        });
        if (!ignore) setAlreadyFollowingJester(found);
      } catch (e) {
        // On error we intentionally leave quest visible; do not set to true.
        console.warn('[Quests] follow status check failed', e);
        if (!ignore) setAlreadyFollowingJester(false);
      } finally {
        if (!ignore) setCheckingFollow(false);
      }
    }
    run();
    return () => { ignore = true; };
  }, [address]);
  const resetHours = Math.floor(secondsUntilReset / 3600);
  const resetMinutes = Math.floor((secondsUntilReset % 3600) / 60);
  const resetSeconds = secondsUntilReset % 60;
  const networkGateActive = requiresBase && !!address && !isOnBase;

  const ensureOnBase = useCallback(async () => {
    if (!requiresBase) return true;
    if (isOnBase) return true;
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: base.id });
        return true;
      }
    } catch (err: any) {
      console.error('[Triviacast] switchChain to Base failed', err);
      setInlineError(err?.message ? `Switch network: ${err.message}` : 'Switch to Base to claim quests.');
      return false;
    }
    setInlineError('Switch to Base network in your wallet to claim quests.');
    return false;
  }, [isOnBase, requiresBase, setInlineError, switchChainAsync]);

  // Gasless claim removed.

  // Determine follow-quest visibility:
  const userHasTooMuchIQ = (iqPoints ?? 0) >= FOLLOW_IQ_CAP;
  const followQuestVisible = !claimedFollowJester && alreadyFollowingJester !== true && !userHasTooMuchIQ;

  // CAST options: single button cycles through these options, posts the active message and advances
  const CAST_OPTIONS = [
    {
      label: 'Funny',
      emoji: '📣',
      message:
        "Joined Triviacast — where my brain gets rewarded for being cheeky. Just earned an iQ for making sense of nonsense. If my neurons start high-fiving, mind your own synapses. 🧠🎉 #Triviacast",
    },
    {
      label: 'Smart',
      emoji: '📣',
      message:
        "Just tried Triviacast: short quizzes, daily quests, and measurable learning. Earn iQ while you learn something new every day. Thoughtful fun > mindless scrolling. 🧠📚 #Triviacast",
    },
    {
      label: 'Witty',
      emoji: '📣',
      // Witty uses "T points for cleverness" as requested
      message:
        "Turn your scroll into a brain workout — Triviacast hands out T points for cleverness. I'm trading memes for medals and loving the ROI on my attention. Ready to flex some neurons? 😉🏆 #Triviacast",
    },
  ];

  const [castIndex, setCastIndex] = useState(0);

  // Handler: use single button to mark share, copy the pre-composed message to clipboard, open share URL,
  // then advance to the next message so the next click will use a different tone.
  const handleSingleCastButton = async () => {
    // If user already marked a share for today, don't re-mark / spam.
    if (isShareMarkedToday()) {
      showToast('Cast already recorded for today — check your claim button', 'info');
      return;
    }

    // Record local mark that user initiated a cast action
    try {
      markShareDone();
    } catch (e) {
      // ignore
    }

    const msg = CAST_OPTIONS[castIndex].message;

    // Try to copy message to clipboard for easy pasting into Warpcast
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(msg);
        showToast('Cast text copied to clipboard — open Warpcast to paste', 'success');
      } else {
        showToast('Open Warpcast to paste the suggested cast', 'success');
      }
    } catch (e) {
      // fallback: still show toast
      showToast('Open Warpcast to paste the suggested cast', 'success');
    }

    // Open the share URL (existing behavior). The clipboard copy gives user the exact content to paste.
    try {
      openShareUrl(shareAppUrl());
    } catch (e) {
      // ignore
    }

    // small visual burst
    setCastBurst(true);
    setTimeout(() => setCastBurst(false), 900);

    // Advance to next option (wrap-around)
    setCastIndex((i) => (i + 1) % CAST_OPTIONS.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] py-6 sm:py-10">
      <div className="max-w-3xl mx-auto px-3 sm:px-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/brain-small.svg" alt="Brain" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] text-center">Daily Quests</h1>
          <div className="text-sm text-[#5a3d5c]">Reset in {resetHours}h {resetMinutes}m {resetSeconds}s</div>
          {address && (
            <WalletIQPoints />
          )}
        </div>

        {/* Network badge removed per request */}

        <div className="space-y-4">
          {/* Quests that can be claimed directly by user without relayer. */}

          {/* Cast quest: single button that cycles through three messages (Funny, Smart, Witty) */}
          <div className="p-4 sm:p-5 bg-white rounded-lg border-4 border-[#F4A6B7] shadow relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="text-3xl sm:text-4xl leading-none drop-shadow-sm">📣</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#2d1b2e]">Cast about Triviacast</h2>
                  <span className="px-2 py-1 bg-[#FFE4EC] border border-[#F4A6B7] rounded text-xs font-semibold text-[#5a3d5c]">+1 iQ</span>
                </div>
                <p className="text-sm text-[#5a3d5c] mb-3 leading-relaxed">
                  Tap the button to post a ready-made cast. The button cycles through three tones: Funny, Smart, and Witty.
                  The Witty option mentions T points for cleverness.
                </p>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      aria-label={`Cast now - ${CAST_OPTIONS[castIndex].label}`}
                      className={`btn-cta ${isShareMarkedToday() ? '' : 'pulsing'} px-4 py-2 rounded-lg text-sm font-bold shadow min-w-[140px]`}
                      onClick={handleSingleCastButton}
                      disabled={isShareMarkedToday()}
                    >
                      <span className="cta-emoji">{CAST_OPTIONS[castIndex].emoji}</span>
                      {CAST_OPTIONS[castIndex].label}
                    </button>
                    {castBurst && <span className="emoji-burst">✨</span>}
                  </div>

                  <div className="flex-1 text-sm text-[#5a3d5c]">
                    <div className="font-semibold mb-1">Suggested cast ({CAST_OPTIONS[castIndex].label}):</div>
                    <div className="rounded-md p-2 bg-[#FFF5F7] border border-[#F4A6B7] text-xs">{CAST_OPTIONS[castIndex].message}</div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {alreadyFollowingJester === true ? (
            <div className="p-4 bg-white/70 border-2 border-[#DC8291] rounded-lg text-xs text-[#5a3d5c]">
              ✅ You already follow @jesterinvestor — quest hidden.
            </div>
          ) : (
            <>
              {followQuestVisible ? (
                <>
                  <QuestCard
                    title="Follow @jesterinvestor"
                    emoji="👤"
                    description="Follow @jesterinvestor on Farcaster (manual trust now)."
                    reward="+50 iQ"
                    claimed={claimedFollowJester}
                    // keep disabled guards for claim action (e.g., no address, errors, checking)
                    disabled={
                      claimedFollowJester ||
                      !address ||
                      !!error ||
                      switchingChain ||
                      !isFollowMarkedToday() ||
                      checkingFollow
                    }
                    onClaim={async () => {
                      setInlineError(null);
                      const ok = await ensureOnBase();
                      if (!ok) return;
                      await claimFollowJester();
                      try {
                        window.dispatchEvent(new Event('triviacast:questClaimed'));
                        window.dispatchEvent(new Event('triviacast:iqUpdated'));
                        window.dispatchEvent(new CustomEvent('triviacast:toast', { detail: { type: 'success', message: '+50 iQ claimed' } }));
                      } catch {}
                    }}
                    loading={loading || checkingFollow}
                  />
                  <div className="text-xs -mt-3 mb-4 text-[#5a3d5c] flex items-center gap-3">
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Follow now"
                        className={`btn-cta ${isFollowMarkedToday() ? '' : 'pulsing'}`}
                        onClick={() => {
                          // local mark for today's follow action
                          if (isFollowMarkedToday()) {
                            showToast('Follow action already recorded for today', 'info');
                          } else {
                            markFollowDone();
                            showToast('Follow action recorded — Claim enabled for today', 'success');
                          }
                          try { window.open('https://farcaster.xyz/jesterinvestor', '_blank', 'noopener'); } catch {}
                          setFollowBurst(true);
                          setTimeout(() => setFollowBurst(false), 900);
                        }}
                        disabled={checkingFollow || isFollowMarkedToday() || claimedFollowJester}
                      >
                        <span className="cta-emoji">👤</span>
                        {checkingFollow ? 'Checking…' : 'Follow now'}
                      </button>
                      {followBurst && <span className="emoji-burst">🎉</span>}
                    </div>
                    <span className="opacity-80">{checkingFollow ? 'Verifying existing follow…' : 'Open Farcaster to follow, then come back and press Claim.'}</span>
                  </div>
                </>
              ) : null}
            </>
          )}

          {/* Daily claim: +1 iQ */}
          <QuestCard
            title="Daily claim"
            emoji="🗓️"
            description="Come back daily to claim your micro iQ bonus."
            reward="+1 iQ"
            claimed={claimedOneIQ}
            disabled={claimedOneIQ || !address || !!error || switchingChain}
            onClaim={async () => {
              setInlineError(null);
              const ok = await ensureOnBase();
              if (!ok) return;
              await claimDailyOneIQ();
              try {
                window.dispatchEvent(new Event('triviacast:questClaimed'));
                window.dispatchEvent(new Event('triviacast:iqUpdated'));
                window.dispatchEvent(new CustomEvent('triviacast:toast', { detail: { type: 'success', message: '+1 iQ claimed' } }));
              } catch {}
            }}
            loading={loading}
          />

        </div>

        {(error || inlineError) && (
          <div className="mt-6 p-4 bg-white border-2 border-red-300 text-red-700 rounded-lg text-sm">
            Error: {inlineError || error}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-[#5a3d5c]">
          Simplified quests: Cast (+1 iQ), Follow (+50 iQ), Daily Claim (+1 iQ). Quiz/Challenge. We trust you to be honest!
        </div>
        {/* Leaderboard intentionally removed from Quests page */}
      </div>
    </div>
  );
}