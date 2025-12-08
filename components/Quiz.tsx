"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSound } from '@/components/SoundContext';
import Image from 'next/image';
import { useAccount } from 'wagmi';

import Timer from './Timer';
import QuizQuestion from './QuizQuestion';
import QuizResults from './QuizResults';

import { calculateTPoints } from '@/lib/tpoints';
import type { QuizState } from '@/types/quiz';

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

  const startQuiz = async () => {
    setLoading(true);
    setError(null);

    // Prevent starting if wallet is not connected (defensive guard in addition to disabled button)
    if (!isConnected || !accountAddress) {
      setError('Connect your wallet silly');
      setLoading(false);
      return;
    }

    try {
      // Note: defer starting music until after quiz state flips to avoid
      // a brief pause caused by the lifecycle effect cleaning up/creating
      // the audio element during the state transition.
      // Request questions without specifying a difficulty (allow all difficulties)
      // For local sources like Farcaster/Base/Christmas, we rely on their
      // internal categories and do not pass the high-level label as a filter.
      const shouldPassCategory = !['Farcaster', 'Base', 'Christmas'].includes(questionCategory);
      const categoryParam = questionCategory && shouldPassCategory
        ? `&category=${encodeURIComponent(questionCategory)}`
        : '';
      const effectiveSource = questionCategory === 'Farcaster'
        ? 'farcaster'
        : questionCategory === 'Base'
          ? 'base'
          : questionCategory === 'Christmas'
            ? 'christmas'
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

      // Start music after quiz state is set so the effect that manages
      // the audio element doesn't race with an early togglePlay call.
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

  // Notify parent when quiz completes so callers can show a share/preview flow
  useEffect(() => {
    if (!quizState.quizCompleted) return;
    // Minimal client-side completion flag for quests gating
    try {
      // Emit client-side event only; backend relayer disabled.
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
    // Only fire when completion state flips to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // ensure audio element exists
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
      // Unmute preference: if the global sound setting is disabled, enable it
      // when user explicitly requests playback via Start or Play button.
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

    // Move to next question or complete quiz
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
  };

  // question source is derived from selected category at runtime

  // Require wallet connection before showing any quiz UI
  if (!isConnected || !accountAddress) {
    return (
      <div className="max-w-2xl mx-auto px-2 sm:px-6">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 text-center border-4 border-[#F4A6B7]">
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
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 text-center border-4 border-[#F4A6B7]">
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
                // Strip common prefixes for display only (preserve full value internally)
                const shortLabel = String(cat).replace(/^(?:Entertainment|Science):\s*/i, '');
                return (
                  <button
                    key={cat}
                    onClick={() => setQuestionCategory(cat === questionCategory ? '' : cat)}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition w-full ${
                      questionCategory === cat
                        ? 'bg-[#F4A6B7] text-white shadow-lg scale-105'
                        : 'bg-white text-[#5a3d5c] border-2 border-[#F4A6B7] hover:bg-[#FFE4EC]'
                    }`}
                    title={cat}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
            {questionCategory && (
              <div className="mt-2 text-xs text-gray-600">Selected: <strong>{questionCategory}</strong></div>
            )}
          </div>

          {/* (Question source removed — source is derived from selected category) */}

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
          <button
            onClick={startQuiz}
            disabled={loading}
            aria-disabled={loading}
            className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-4 px-8 rounded-lg text-lg transition disabled:opacity-50 shadow-lg w-full sm:w-auto min-h-[56px]"
          >
            {loading ? 'Loading...' : 'Start Quiz'}
          </button>
        </div>

        {/* source-change confirmation removed */}
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