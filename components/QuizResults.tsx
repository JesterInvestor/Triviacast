'use client';

import { Question } from '@/types/quiz';
import Link from 'next/link';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect, useState } from 'react';
import { addPointsOnChain, isContractConfigured } from '@/lib/contract';
import { addWalletTPoints } from '@/lib/tpoints';
import { shareResultsUrl, openShareUrl } from '@/lib/farcaster';
import Image from 'next/image';

// Distributor/claim functionality removed from this component

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  questions: Question[];
  answers: (string | null)[];
  tPoints: number;
  onRestart: () => void;
  category?: string;
}

function decodeHtml(html: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

export default function QuizResults({
  score,
  totalQuestions,
  questions,
  answers,
  tPoints,
  onRestart,
  category
}: QuizResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<Error | null>(null);
  const [savingPoints, setSavingPoints] = useState(false);
  const [pointsSaved, setPointsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Save points when component mounts
  useEffect(() => {
    if (!address || tPoints === 0 || pointsSaved) {
      console.debug('[Triviacast] Skipping savePoints:', {
        address,
        tPoints,
        pointsSaved
      });
      return;
    }
    const savePoints = async () => {
      console.info('[Triviacast] savePoints called', {
        tPoints,
        pointsSaved,
        contractConfigured: isContractConfigured(),
        activeAccount: address
      });

      setSavingPoints(true);
      setSaveError(null);
      setSigning(true);
      setSignError(null);
      try {
        const message = `I am claiming ${tPoints} T Points for completing the Triviacast quiz on ${new Date().toISOString()}`;
        console.debug('[Triviacast] Requesting signature:', { address, message });
        let signature;
        try {
          signature = await signMessageAsync({ message });
        } catch (err) {
          setSignError(err as Error);
          setSaveError('Signature was not provided. T Points cannot be awarded.');
          setSigning(false);
          setSavingPoints(false);
          return;
        }

        // Save locally first
        console.debug('[Triviacast] addWalletTPoints', { address, tPoints });
        await addWalletTPoints(address, tPoints);

        // Optionally save to chain
        if (isContractConfigured()) {
          try {
            console.debug('[Triviacast] Calling addPointsOnChain', { address, tPoints, signature });
            await addPointsOnChain(address, tPoints);
            console.log('Points saved to blockchain successfully');
          } catch (error) {
            console.error('Failed to save points to blockchain:', error);
            setSaveError('Open miniapp with Farcaster to get T points and $TRIV');
          }
        } else {
          console.warn('[Triviacast] Contract not configured, skipping blockchain save');
        }

        setPointsSaved(true);

        // Record event server-side (fire-and-forget)
        (async () => {
          try {
            await fetch('/api/points', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wallet: address, points: tPoints, source: 'quiz' })
            });
          } catch (e) {
            console.debug('Failed to record points event to server', e);
          }
        })();
      } catch (error) {
        console.error('Failed to save points (local or blockchain):', error);
        setSaveError('Failed to save points. Please try again and score even better this time.');
      } finally {
        setSigning(false);
        setSavingPoints(false);
      }
    };

    savePoints();
  }, [address, tPoints, pointsSaved, signMessageAsync]);

  const getResultMessage = () => {
    if (tPoints === 1000) return "One lonely warp. Like casting to /alpha at 3am—no recasts, just vibes. 🥲";
    if (percentage === 100) return "Perfect frame flip. Absolute signal. Expect unsolicited warps. 🟣";
    if (percentage >= 90) return "Onchain grey-matter. DWR farm online. 🔥";
    if (percentage >= 80) return "Certified Frame Lord. People will quote-cast you for clout. 👑";
    if (percentage >= 60) return "Cast-worthy run—needs a couple more recasts. 📈";
    if (percentage >= 40) return "Starter pack energy: 1 warp, 0 replies, solid potential. 🚀";
    if (percentage >= 20) return "You casted, the feed scrolled. Touch more frames. 🧪";
    return "Rugged by trivia. Rage-cast, regroup, return. 💀";
  };

  const getResultColor = () => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-[#F4A6B7]';
    if (percentage >= 40) return 'text-[#DC8291]';
    return 'text-red-600';
  };

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-6">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-8 border-4 border-[#F4A6B7]">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
          <Image src="/brain-large.svg" alt="Brain" width={64} height={64} className="w-16 h-16 sm:w-20 sm:h-20" priority />
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#2d1b2e]">Quiz Complete!</h2>
        </div>

        <div className="text-center mb-4 sm:mb-6">
          <button
            onClick={() => openShareUrl(shareResultsUrl(score, totalQuestions, percentage, tPoints, category))}
            className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-3 px-6 rounded-lg text-base sm:text-lg transition inline-flex items-center justify-center shadow-lg"
            aria-label="Share results on Farcaster"
          >
            <Image src="/farcaster.svg" alt="Farcaster" width={16} height={16} className="w-4 h-4 mr-2" />
            Share Results
          </button>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <div className={`text-4xl sm:text-6xl font-bold mb-2 ${getResultColor()}`}>{score}/{totalQuestions}</div>
          <div className="text-xl sm:text-2xl text-[#5a3d5c] mb-2">{percentage}% Correct</div>
          <div className="text-lg sm:text-xl font-semibold text-[#2d1b2e]">{getResultMessage()}</div>

          <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-gradient-to-r from-[#FFE4EC] to-[#FFC4D1] rounded-lg border-2 border-[#F4A6B7] shadow-lg">
            <div className="text-2xl sm:text-3xl font-bold text-[#DC8291] mb-2">🏆 {tPoints.toLocaleString()} T Points Earned!</div>
            <div className="text-xs sm:text-sm text-[#5a3d5c] font-medium mb-2">
              • 1000 T points per correct answer<br />
              • 500 bonus for 3 in a row<br />
              • 1000 bonus for 5 in a row<br />
              • 2000 bonus for perfect 10!
            </div>
            {savingPoints && (
              <div className="text-xs text-[#5a3d5c] italic mt-2">💾 Saving points to blockchain...</div>
            )}
            {signError && (
              <div className="text-xs text-orange-600 mt-2">⚠️ Signature error: {signError.message}</div>
            )}
            {pointsSaved && !saveError && isContractConfigured() && (
              <div className="text-xs text-green-700 font-semibold mt-2">✅ Points saved to blockchain!</div>
            )}
            {saveError && (
              <div className="text-xs text-orange-600 mt-2">⚠️ {saveError}</div>
            )}
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-[#2d1b2e] flex items-center gap-2">
            <Image src="/brain-small.svg" alt="Brain" width={20} height={20} className="w-5 h-5 sm:w-6 sm:h-6" loading="lazy" />
            Review Answers:
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {questions.map((question, index) => {
              const userAnswer = answers[index];
              const isCorrect = userAnswer === question.correct_answer;
              // Some question objects may include an optional explanation property.
              const explanation = (question as any).explanation;
              const hasExplanation = typeof explanation === 'string' && explanation.trim().length > 0;

              return (
                <div
                  key={index}
                  className={`p-3 sm:p-4 rounded-lg border-2 ${
                    isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#F4A6B7] text-sm sm:text-base">Q{index + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium mb-2 text-[#2d1b2e] text-sm sm:text-base break-words">
                        {decodeHtml(question.question)}
                      </div>
                      <div className="text-xs sm:text-sm space-y-1">
                        <div className="break-words">
                          <span className="font-semibold text-[#2d1b2e]">Your answer: </span>
                          <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {userAnswer ? decodeHtml(userAnswer) : 'No answer'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="break-words">
                            <span className="font-semibold text-[#2d1b2e]">Correct answer: </span>
                            <span className="text-green-700">{decodeHtml(question.correct_answer)}</span>
                          </div>
                        )}

                        {hasExplanation && (
                          <div className="break-words mt-2 p-2 bg-white rounded border border-[#eee] text-sm text-[#4a3a4a]">
                            <span className="font-semibold text-[#2d1b2e]">Explanation: </span>
                            <span>{decodeHtml(explanation)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isCorrect ? <span className="text-xl sm:text-2xl">✓</span> : <span className="text-xl sm:text-2xl">✗</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={onRestart}
            className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-4 px-8 rounded-lg text-base sm:text-lg transition shadow-lg min-h-[52px] w-full sm:w-auto"
          >
            Try Again
          </button>
          <Link
            href="/leaderboard"
            className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-4 px-8 rounded-lg text-base sm:text-lg transition inline-flex items-center justify-center shadow-lg min-h-[52px] w-full sm:w-auto"
          >
            View Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
// Claim daily functionality removed from this component