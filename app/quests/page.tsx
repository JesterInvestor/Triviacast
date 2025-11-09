"use client";

import { useAccount } from 'wagmi';
import { useIQPoints } from '@/lib/hooks/useIQPoints';
import { useQuestIQ } from '@/lib/hooks/useQuestIQ';
import { useEffect, useState } from 'react';

// Minimal client-side flag: set localStorage 'triviacast:lastQuizCompletedDay' when quiz finishes.
// We'll read it here to decide if Daily Quiz Play claim is enabled.

function useQuizCompletedToday() {
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    const today = Math.floor(Date.now()/86400_000); // ms -> days
    try {
      const v = localStorage.getItem('triviacast:lastQuizCompletedDay');
      if (!v) { setCompleted(false); return; }
      setCompleted(parseInt(v,10) === today);
    } catch { setCompleted(false); }
    const listener = () => {
      const t = Math.floor(Date.now()/86400_000);
      try {
        const vv = localStorage.getItem('triviacast:lastQuizCompletedDay');
        setCompleted(!!vv && parseInt(vv,10) === t);
      } catch {}
    };
    window.addEventListener('triviacast:quizCompleted', listener);
    return () => window.removeEventListener('triviacast:quizCompleted', listener);
  }, []);
  return completed;
}

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
  const { iqPoints } = useIQPoints(address as `0x${string}` | undefined);
  const gasless = process.env.NEXT_PUBLIC_QUEST_GASLESS === 'true';
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { claimedShare, claimedQuizPlay, claimedChallenge, claimedFollowJester, claimedOneIQ, claimShare, claimDailyQuizPlay, claimDailyChallenge, claimFollowJester, claimDailyOneIQ, loading, error, secondsUntilReset } = useQuestIQ(address as `0x${string}` | undefined);
  const quizCompletedToday = useQuizCompletedToday();
  const resetHours = Math.floor(secondsUntilReset / 3600);
  const resetMinutes = Math.floor((secondsUntilReset % 3600) / 60);
  const resetSeconds = secondsUntilReset % 60;

  async function claimGasless(questId: number, user: `0x${string}`) {
    const res = await fetch('/api/quests/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questId, address: user })
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `gasless claim failed (${res.status})`);
    }
    return res.json();
  }

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

        <div className="space-y-4">
          <QuestCard
            title="Daily Quiz Play"
            emoji="🧠"
            description="Play the quiz today, then claim your reward."
            reward="1,000 iQ"
            claimed={claimedQuizPlay}
            disabled={claimedQuizPlay || !address || !quizCompletedToday || !!error}
            onClaim={async () => {
              setInlineError(null);
              if (gasless && address) {
                try { await claimGasless(2, address as `0x${string}`); } catch (e: any) { setInlineError(e.message); return; }
              } else {
                await claimDailyQuizPlay();
              }
            }}
            loading={loading}
          />

          <QuestCard
            title="Daily Challenge"
            emoji="🔥"
            description="Harder multi-step task (placeholder)."
            reward="10,000 iQ"
            claimed={claimedChallenge}
            disabled={claimedChallenge || !address || !!error}
            onClaim={async () => {
              setInlineError(null);
              if (gasless && address) {
                try { await claimGasless(3, address as `0x${string}`); } catch (e: any) { setInlineError(e.message); return; }
              } else {
                await claimDailyChallenge();
              }
            }}
            loading={loading}
          />

          <QuestCard
            title="Follow @jesterinvestor"
            emoji="👤"
            description="Follow @jesterinvestor on Farcaster (manual trust now)."
            reward="5 iQ"
            claimed={claimedFollowJester}
            disabled={claimedFollowJester || !address || !!error}
            onClaim={async () => {
              setInlineError(null);
              if (gasless && address) {
                try { await claimGasless(4, address as `0x${string}`); } catch (e: any) { setInlineError(e.message); return; }
              } else { await claimFollowJester(); }
              try {
                window.dispatchEvent(new Event('triviacast:questClaimed'));
                window.dispatchEvent(new Event('triviacast:iqUpdated'));
                window.dispatchEvent(new CustomEvent('triviacast:toast', { detail: { type: 'success', message: '+5 iQ claimed' } }));
              } catch {}
            }}
            loading={loading}
          />

          <QuestCard
            title="Daily +1 iQ"
            emoji="✨"
            description="Login bonus — claim 1 iQ each day."
            reward="1 iQ"
            claimed={claimedOneIQ}
            disabled={claimedOneIQ || !address || !!error}
            onClaim={async () => {
              setInlineError(null);
              if (gasless && address) {
                try { await claimGasless(5, address as `0x${string}`); } catch (e: any) { setInlineError(e.message); return; }
              } else { await claimDailyOneIQ(); }
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
          Minimal gating: quiz completion is a local flag today; on-chain or attestation gating planned. {gasless ? 'Gasless claims are enabled.' : 'Gasless claims not configured.'}
        </div>
      </div>
    </div>
  );
}

