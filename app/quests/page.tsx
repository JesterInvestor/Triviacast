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

export default function QuestsPage() {
  const { address } = useAccount();
  const { iqPoints } = useIQPoints(address as `0x${string}` | undefined);
  const { claimedShare, claimedQuizPlay, claimedChallenge, claimShare, claimDailyQuizPlay, claimDailyChallenge, loading, error, secondsUntilReset } = useQuestIQ(address as `0x${string}` | undefined);
  const quizCompletedToday = useQuizCompletedToday();
  const resetHours = Math.floor(secondsUntilReset/3600);
  const resetMinutes = Math.floor((secondsUntilReset%3600)/60);
  const resetSeconds = secondsUntilReset%60;

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

        {!address && (
          <div className="mb-6 p-4 bg-white border-2 border-[#F4A6B7] rounded-lg text-center text-[#5a3d5c] font-medium">
            Connect your wallet to start claiming daily iQ.
          </div>
        )}

        <div className="grid gap-4 sm:gap-6">
          {/* Share Quest */}
          <QuestCard
            title="Daily Share"
            emoji="📣"
            description="Cast your results or the app link to claim. Manual trust for now."
            reward="5,000 iQ"
            claimed={claimedShare}
            disabled={claimedShare || !address || !!error}
            onClaim={claimShare}
            loading={loading}
          />

            {/* Daily Quiz Play Quest */}
          <QuestCard
            title="Daily Quiz Play"
            emoji="🧠"
            description={quizCompletedToday ? 'You played a quiz today — claim now.' : 'Complete at least one quiz today to unlock claim.'}
            reward="1,000 iQ"
            claimed={claimedQuizPlay}
            disabled={claimedQuizPlay || !address || !quizCompletedToday || !!error}
            onClaim={claimDailyQuizPlay}
            loading={loading}
          />

          {/* Daily Challenge placeholder */}
          <QuestCard
            title="Daily Challenge"
            emoji="🔥"
            description="Harder multi-step task (placeholder)."
            reward="10,000 iQ"
            claimed={claimedChallenge}
            disabled={claimedChallenge || !address || !!error}
            onClaim={claimDailyChallenge}
            loading={loading}
          />
        </div>

        {error && (
          <div className="mt-6 p-4 bg-white border-2 border-red-300 text-red-700 rounded-lg text-sm">
            Error: {error}
          </div>
        )}
        <div className="mt-8 text-center text-xs text-[#5a3d5c]">
          Minimal gating: quiz completion is a local flag today; on-chain or attestation gating planned.
        </div>
      </div>
    </div>
  );
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

