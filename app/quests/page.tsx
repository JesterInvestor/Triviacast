"use client";

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useIQPoints } from '@/lib/hooks/useIQPoints';
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
import Leaderboard from '@/components/Leaderboard';
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
                className={`px-4 py-2 rounded-lg text-sm font-bold shadow transition min-w-[120px] ${disabled || loading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white'}`}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] py-6 sm:py-10">
      <div className="max-w-3xl mx-auto px-3 sm:px-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/brain-small.svg" alt="Brain" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] text-center">Daily Quests</h1>
          <div className="text-sm text-[#5a3d5c]">Reset in {resetHours}h {resetMinutes}m {resetSeconds}s</div>
          {address && (
            <div className="px-4 py-2 rounded-lg bg-[#E3F5FF] border-2 border-[#7BC3EC] text-[#1b3d5c] font-semibold text-sm shadow">
              iQ Balance: {iqPoints ? Number(iqPoints).toLocaleString() : '—'}
            </div>
          )}
        </div>

        {requiresBase && address && (
          <div className="mb-4 flex justify-center">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm shadow ${isOnBase ? 'bg-[#E3F5FF]/70 border-[#7BC3EC]' : 'bg-white border-[#DC8291]'}`}>
              <span>Network: <span className={`font-semibold ${isOnBase ? 'text-[#1b3d5c]' : 'text-[#b14f5f]'}`}>{chainLabel}</span></span>
              {!isOnBase && (
                <button
                  onClick={() => switchChain?.({ chainId: base.id })}
                  disabled={switchingChain}
                  className="bg-[#2d1b2e] text-[#FFE4EC] px-3 py-1 rounded disabled:opacity-50"
                >{switchingChain ? 'Switching…' : 'Switch to Base'}</button>
              )}
            </div>
          </div>
        )}
        {requiresBase && address && switchError && (
          <div className="mb-4 text-center text-sm text-red-600">Switch failed: {switchError.message}</div>
        )}
        {networkGateActive && (
          <div className="mb-4 text-center text-sm text-[#b14f5f]">Switch to Base mainnet to claim quest rewards.</div>
        )}

        <div className="space-y-4">
          {/* Quests that can be claimed directly by user without relayer. */}

          {/* Cast quest: +1 iQ */}
          <QuestCard
            title="Cast about Triviacast"
            emoji="📣"
            description="Post a quick cast about Triviacast. You can use the cast shortcut, then claim."
            reward="+1 iQ"
            claimed={claimedShare}
            disabled={claimedShare || !address || !!error || switchingChain || !isShareMarkedToday()}
            onClaim={async () => {
              setInlineError(null);
              const ok = await ensureOnBase();
              if (!ok) return;
              await claimShare();
              try {
                window.dispatchEvent(new Event('triviacast:questClaimed'));
                window.dispatchEvent(new Event('triviacast:iqUpdated'));
                window.dispatchEvent(new CustomEvent('triviacast:toast', { detail: { type: 'success', message: '+1 iQ claimed' } }));
              } catch {}
            }}
            loading={loading}
          />
          <div className="-mt-3 mb-2 flex items-center gap-3 text-xs text-[#5a3d5c]">
            <div className="relative">
              <button
                type="button"
                aria-label="Cast now"
                className={`btn-cta ${isShareMarkedToday() ? '' : 'pulsing'}`}
                onClick={() => {
                  markShareDone();
                  showToast('Cast action recorded — Claim enabled for today', 'success');
                  try { openShareUrl(shareAppUrl()); } catch {}
                  // small emoji burst
                  setCastBurst(true);
                  setTimeout(() => setCastBurst(false), 900);
                }}
              >
                <span className="cta-emoji">📣</span>
                Cast now
              </button>
              {castBurst && <span className="emoji-burst">✨</span>}
            </div>
            <span className="opacity-80">Open Warpcast, then come back and press Claim.</span>
          </div>

          <QuestCard
            title="Follow @jesterinvestor"
            emoji="👤"
            description="Follow @jesterinvestor on Farcaster (manual trust now)."
            reward="+50 iQ"
            claimed={claimedFollowJester}
            disabled={claimedFollowJester || !address || !!error || switchingChain || !isFollowMarkedToday()}
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
            loading={loading}
          />
          <div className="text-xs -mt-3 mb-4 text-[#5a3d5c] flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                aria-label="Follow now"
                className={`btn-cta ${isFollowMarkedToday() ? '' : 'pulsing'}`}
                onClick={() => {
                  markFollowDone();
                  showToast('Follow action recorded — Claim enabled for today', 'success');
                  try { window.open('https://farcaster.xyz/jesterinvestor', '_blank', 'noopener'); } catch {}
                  setFollowBurst(true);
                  setTimeout(() => setFollowBurst(false), 900);
                }}
              >
                <span className="cta-emoji">👤</span>
                Follow now
              </button>
              {followBurst && <span className="emoji-burst">🎉</span>}
            </div>
            <span className="opacity-80">Open Farcaster to follow, then come back and press Claim (Follow reveals Claim for today).</span>
          </div>

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
          Simplified quests: Cast (+1 iQ), Follow (+50 iQ), Daily Claim (+1 iQ). Quiz/Challenge remain disabled (require relayer).
        </div>
        {/* Insert the global iQ leaderboard here */}
        <div className="mt-8">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}

