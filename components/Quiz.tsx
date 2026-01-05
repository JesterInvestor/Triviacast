"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSound } from '@/components/SoundContext';
import Image from 'next/image';
import { useAccount } from 'wagmi';

import Timer from './Timer';
import QuizQuestion from './QuizQuestion';
import QuizResults from './QuizResults';

import { calculateTPoints, getWalletTotalPoints } from '@/lib/tpoints';
import type { QuizState } from '@/types/quiz';
import { canAccessCategory, getRequiredPoints, isCategoryGated } from '@/lib/categoryGating';

const QUIZ_TIME_LIMIT = 60; // 1 minute in seconds
const TIME_PER_QUESTION = 6; // ~6 seconds per question (informational only)

export default function Quiz({ onComplete }: { onComplete?: (result: { quizId: string; score: number; details?: any }) => void } = {}) {
  const sound = useSound();
  const { address: accountAddress, isConnected } = useAccount();
  const [questionCategory, setQuestionCategory] = useState<string>('');
  const CATEGORIES = [
    'General Knowledge',
    'Farcaster',
    'Base',
    'Christmas',
    'Podcasts',
    'Entertainment: Books',
    'Entertainment: Film',
    'Entertainment: Music',
    'Entertainment: Musicals & Theatres',
    'Entertainment: Television',
    'Entertainment: Video Games',
    'Entertainment: Board Games',
    'Science & Nature',
    'Science: Computers',
    'Science: Mathematics',
    'Mythology',
    'Sports',
    'Geography',
    'History',
    'Politics',
    'Art',
    'Celebrities',
    'Animals',
    'Vehicles',
    'Entertainment: Comics',
    'Science: Gadgets',
    'Entertainment: Japanese Anime & Manga',
    'Entertainment: Cartoon & Animations',
  ];
  // question source will be derived from the selected category at request time
  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    timeRemaining: QUIZ_TIME_LIMIT,
    quizStarted: false,
    quizCompleted: false,
    consecutiveCorrect: 0,
    tPoints: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [userTPoints, setUserTPoints] = useState<number>(0);

  // Update startQuiz to accept category param
  const startQuiz = async (selectedCategory?: string) => {
    setLoading(true);
    setError(null);

    // Prevent starting if wallet is not connected (defensive guard in addition to disabled button)
    if (!isConnected || !accountAddress) {
      setError('Connect your wallet silly');
      setLoading(false);
      return;
    }

    const categoryToUse = selectedCategory ?? questionCategory;

    // Check if user has access to the selected category
    if (categoryToUse && !canAccessCategory(categoryToUse, userTPoints)) {
      const requiredPoints = getRequiredPoints(categoryToUse);
      setError(`This category requires ${requiredPoints.toLocaleString()} T Points. You have ${userTPoints.toLocaleString()} T Points. Play more quizzes to unlock!`);
      setLoading(false);
      return;
    }

    try {
      const shouldPassCategory = !['Farcaster', 'Base', 'Christmas', 'Podcasts'].includes(categoryToUse);
      const categoryParam = categoryToUse && shouldPassCategory
        ? `&category=${encodeURIComponent(categoryToUse)}`
        : '';
      const effectiveSource = categoryToUse === 'Farcaster'
        ? 'farcaster'
        : categoryToUse === 'Base'
          ? 'base'
          : categoryToUse === 'Christmas'
            ? 'christmas'
            : categoryToUse === 'Podcasts'
              ? 'podcasts'
              : 'opentdb';
      const response = await fetch(`/api/questions?amount=10&source=${effectiveSource}${categoryParam}`);
      const data = await response.json();

      if (!response.ok || data?.error) {
        throw new Error(data?.error || 'Failed to load quiz');
      }

      setQuizState({
        questions: data.results,
        currentQuestionIndex: 0,
        score: 0,
        answers: new Array(data.results.length).fill(null),
        timeRemaining: QUIZ_TIME_LIMIT,
        quizStarted: true,
        quizCompleted: false,
        consecutiveCorrect: 0,
        tPoints: 0,
      });

      try {
        await togglePlay(true);
      } catch (_) {
        // ignore — the lifecycle effect will try again if necessary
      }
    } catch (err) {
      setError('Failed to load quiz questions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Main timer
  useEffect(() => {
    if (!quizState.quizStarted || quizState.quizCompleted) return;

    const timer = setInterval(() => {
      setQuizState((prev) => {
        if (prev.timeRemaining <= 1) {
          clearInterval(timer);
          return { ...prev, timeRemaining: 0, quizCompleted: true };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState.quizStarted, quizState.quizCompleted]);

  // Fetch user's T points when wallet connects
  useEffect(() => {
    async function fetchUserPoints() {
      if (accountAddress && isConnected) {
        try {
          const points = await getWalletTotalPoints(accountAddress);
          setUserTPoints(points);
        } catch (err) {
          console.error('Failed to fetch user T points:', err);
          setUserTPoints(0);
        }
      } else {
        setUserTPoints(0);
      }
    }
    fetchUserPoints();
  }, [accountAddress, isConnected]);

  // Notify parent when quiz completes so callers can show a share/preview flow
  useEffect(() => {
    if (!quizState.quizCompleted) return;
    try {
      window.dispatchEvent(new Event('triviacast:quizCompleted'));
    } catch {}
    try {
      onComplete?.({
        quizId: 'triviacast',
        score: quizState.score,
        details: {
          total: quizState.questions.length,
          tPoints: quizState.tPoints,
          category: questionCategory || undefined,
        },
      });
    } catch (_) {
      // ignore downstream errors from consumer
    }
  }, [quizState.quizCompleted]);

  // Background music lifecycle: create/cleanup only on quiz lifecycle
  useEffect(() => {
    if (quizState.quizStarted && !quizState.quizCompleted) {
      if (!audioRef.current) {
        const audio = new Audio('/giggly-bubble-222533.mp3');
        audio.loop = true;
        audio.volume = sound.disabled ? 0 : 0.14;
        audio.muted = !!sound.disabled;
        audioRef.current = audio;

        if (!audio.muted) {
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise
              .then(() => setIsMusicPlaying(true))
              .catch(() => setIsMusicPlaying(false));
          } else {
            setIsMusicPlaying(!audio.paused);
          }
        } else {
          setIsMusicPlaying(false);
        }
      }
    }

    if (quizState.quizCompleted && audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (_) {}
      setIsMusicPlaying(false);
    }

    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current = null;
        } catch (_) {
          audioRef.current = null;
        }
      }
    };
  }, [quizState.quizStarted, quizState.quizCompleted]);

  // Centralized audio control used by both the Start button and Play/Pause button
  async function togglePlay(shouldPlay?: boolean) {
    if (!audioRef.current) {
      const a = new Audio('/giggly-bubble-222533.mp3');
      a.loop = true;
      a.volume = sound.disabled ? 0 : 0.14;
      a.muted = !!sound.disabled;
      audioRef.current = a;
    }

    const audio = audioRef.current;
    const play = typeof shouldPlay === 'undefined' ? audio.paused : !!shouldPlay;

    if (play) {
      try {
        if (sound.disabled) {
          try { sound.set(false); } catch {}
        }
      } catch {}

      try {
        audio.muted = false;
        audio.volume = 0.14;
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          await p.then(() => setIsMusicPlaying(true)).catch(() => setIsMusicPlaying(false));
        } else {
          setIsMusicPlaying(!audio.paused);
        }
      } catch (err) {
        setIsMusicPlaying(false);
        throw err;
      }
    } else {
      try {
        audio.pause();
      } catch (_) {}
      setIsMusicPlaying(false);
    }
  }

  // React to mute/unmute without recreating the audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (sound.disabled) {
      try {
        audio.muted = true;
        audio.pause();
        audio.volume = 0;
      } catch (_) {}
      setIsMusicPlaying(false);
    } else {
      try {
        audio.muted = false;
        audio.volume = 0.14;
        if (audio.paused) {
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise
              .then(() => setIsMusicPlaying(true))
              .catch(() => setIsMusicPlaying(false));
          } else {
            setIsMusicPlaying(!audio.paused);
          }
        }
      } catch (_) {}
    }
  }, [sound.disabled]);

  const handleAnswer = (answer: string) => {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correct_answer;

    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestionIndex] = answer;

    setQuizState((prev) => {
      const newConsecutive = isCorrect ? prev.consecutiveCorrect + 1 : 0;
      const earnedPoints = calculateTPoints(newConsecutive, isCorrect, prev.consecutiveCorrect);

      return {
        ...prev,
        answers: newAnswers,
        score: isCorrect ? prev.score + 1 : prev.score,
        consecutiveCorrect: newConsecutive,
        tPoints: prev.tPoints + earnedPoints,
      };
    });

    setTimeout(() => {
      setQuizState((prev) => {
        const lastIndex = prev.questions.length - 1;
        if (prev.currentQuestionIndex < lastIndex) {
          return { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 };
        }
        return { ...prev, quizCompleted: true };
      });
    }, 500);
  };

  const restartQuiz = () => {
    setQuizState({
      questions: [],
      currentQuestionIndex: 0,
      score: 0,
      answers: [],
      timeRemaining: QUIZ_TIME_LIMIT,
      quizStarted: false,
      quizCompleted: false,
      consecutiveCorrect: 0,
      tPoints: 0,
    });
    setError(null);
    setQuestionCategory('');
  };

  // Require wallet connection before showing any quiz UI
  if (!isConnected || !accountAddress) {
    return (
      <div className="max-w-2xl mx-auto px-2 sm:px-6">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 text-center border-4 border-[#F4A6B7] relative overflow-visible">
          <div className="mb-4 p-4 bg-[#FFE4EC] border-2 border-[#F4A6B7] text-[#5a3d5c] rounded-lg text-sm sm:text-base">
            🔒 Connect your wallet silly
          </div>
        </div>
      </div>
    );
  }

  // Pre-start state
  if (!quizState.quizStarted) {
    return (
      <div className="max-w-2xl mx-auto px-2 sm:px-6">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 text-center border-4 border-[#F4A6B7] relative overflow-visible">
          <div className="mb-6 flex justify-center">
            <Image src="/brain-large.svg" alt="Brain" width={96} height={96} className="w-24 h-24 sm:w-32 sm:h-32" priority />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-[#2d1b2e]">Trivia Challenge</h1>
          
          {/* Category prompt */}
          <div className="mb-4 flex flex-col items-center w-full">
            <div className="flex items-center gap-3 justify-center w-full">
              <div className="text-lg font-semibold text-[#2d1b2e] text-left">What do you want to quiz about?</div>
              <div className="flex flex-col items-center ml-2">
                <div className="text-2xl leading-none">   💭</div>
                <Image src="/brain-small.svg" alt="Brain" width={36} height={36} className="mt-1" />
              </div>
            </div>

            <div className="mt-3 w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const shortLabel = String(cat).replace(/^(?:Entertainment|Science):\s*/i, '');
                const isGated = isCategoryGated(cat);
                const requiredPoints = getRequiredPoints(cat);
                const hasAccess = canAccessCategory(cat, userTPoints);
                const isLocked = isGated && !hasAccess;

                return (
                  <button
                    key={cat}
                    onClick={async () => {
                      if (!isLocked && !loading) {
                        setQuestionCategory(cat);
                        await startQuiz(cat);
                      }
                    }}
                    disabled={isLocked || loading}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition w-full relative ${
                      questionCategory === cat
                        ? 'bg-[#F4A6B7] text-white shadow-lg scale-105'
                        : isLocked
                          ? 'bg-gray-200 text-gray-400 border-2 border-gray-300 cursor-not-allowed opacity-60'
                          : 'bg-white text-[#5a3d5c] border-2 border-[#F4A6B7] hover:bg-[#FFE4EC]'
                    }`}
                    title={isLocked ? `Requires ${requiredPoints.toLocaleString()} T Points (You have ${userTPoints.toLocaleString()})` : cat}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className={isLocked ? 'line-through' : ''}>{shortLabel}</span>
                      {isLocked && <span className="text-xs">🔒</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {questionCategory && (
              <div className="mt-2 text-xs text-gray-600">Selected: <strong>{questionCategory}</strong></div>
            )}
            {userTPoints > 0 && (
              <div className="mt-2 text-xs text-[#DC8291] font-semibold">
                Your T Points: {userTPoints.toLocaleString()}
              </div>
            )}
          </div>

          {/* Gating Info Box */}
          <div className="mb-6 p-3 bg-[#FFE4EC] border-2 border-[#F4A6B7] rounded-lg text-sm">
            <div className="font-semibold text-[#2d1b2e] mb-2">🔓 Unlock More Categories</div>
            <div className="text-xs text-[#5a3d5c] space-y-1">
              <div>🟢 <strong>Always Available:</strong> General Knowledge, Farcaster, Base, Christmas</div>
              <div>🔒 <strong>20,000 T Points:</strong> Books, Film, Music, Musicals & Theatres</div>
              <div>🔒 <strong>50,000 T Points:</strong> Television, Video Games, Board Games, Science & Nature, Computers, Mathematics, Mythology, Sports</div>
              <div>🔒 <strong>100,000 T Points:</strong> Geography, History, Politics, Art, Celebrities, Animals, Vehicles, Comics, Gadgets, Japanese Anime & Manga, Cartoon & Animations</div>
            </div>
          </div>

          <p className="text-[#5a3d5c] mb-8 text-base sm:text-lg">
            ⏱️ Only 1 minute ⏱️<br />
            ⁉️ 10 questions ⁉️<br />
            😎🤓 Endless bragging rights 😎🤓<br />
            🧠 Ready to prove you're a genius? 🧠
          </p>
          {error && (
            <div className="mb-4 p-4 bg-[#FFE4EC] border-2 border-[#DC8291] text-[#C86D7D] rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}
          {/* Start button removed since selection starts quiz */}
        </div>
      </div>
    );
  }

  // Completed state
  if (quizState.quizCompleted) {
    return (
      <QuizResults
        score={quizState.score}
        totalQuestions={quizState.questions.length}
        questions={quizState.questions}
        answers={quizState.answers}
        tPoints={quizState.tPoints}
        onRestart={restartQuiz}
        category={questionCategory}
      />
    );
  }

  // Active quiz state
  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  const answered = quizState.answers[quizState.currentQuestionIndex] !== null;

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm sm:text-base text-[#5a3d5c] font-semibold">
          Question {quizState.currentQuestionIndex + 1} / {quizState.questions.length}
        </div>
        <div className="flex items-center gap-2">
          <Timer timeRemaining={quizState.timeRemaining} />
          <button
            onPointerUp={async () => {
              try {
                await togglePlay(!isMusicPlaying);
              } catch (_) {
                // ignore
              }
            }}
            aria-pressed={isMusicPlaying}
            className="ml-2 bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-1.5 px-3 rounded-md text-xs shadow"
            type="button"
          >
            {isMusicPlaying ? 'Pause Music' : 'Play Music'}
          </button>
        </div>
      </div>

      <QuizQuestion question={currentQuestion} onAnswer={handleAnswer} answered={answered} />
    </div>
  );
}
