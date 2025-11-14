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
import type { QuestionSource } from '@/types/question';

const QUIZ_TIME_LIMIT = 60; // 1 minute in seconds
const TIME_PER_QUESTION = 6; // ~6 seconds per question (informational only)

export default function Quiz({ onComplete }: { onComplete?: (result: { quizId: string; score: number; details?: any }) => void } = {}) {
  const sound = useSound();
  const { address: accountAddress, isConnected } = useAccount();
  const [questionSource, setQuestionSource] = useState<QuestionSource>('opentdb');
  const [pendingSource, setPendingSource] = useState<QuestionSource | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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
      // Request questions based on selected source
      const sourceParam = questionSource === 'farcaster' ? '&source=farcaster' : '';
      const response = await fetch(`/api/questions?amount=10&difficulty=easy,medium${sourceParam}`);
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
        const audio = new Audio('/giggly-bubbles-222533.mp3');
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

  const handleSourceChange = (newSource: QuestionSource) => {
    if (quizState.quizStarted && !quizState.quizCompleted) {
      // Quiz is active, show confirmation modal
      setPendingSource(newSource);
      setShowConfirmModal(true);
    } else {
      // Quiz not active, change immediately
      setQuestionSource(newSource);
    }
  };

  const confirmSourceChange = () => {
    if (pendingSource) {
      setQuestionSource(pendingSource);
      restartQuiz();
      setPendingSource(null);
    }
    setShowConfirmModal(false);
  };

  const cancelSourceChange = () => {
    setPendingSource(null);
    setShowConfirmModal(false);
  };

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

  // Confirmation Modal
  const ConfirmationModal = () => {
    if (!showConfirmModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 max-w-md w-full border-4 border-[#F4A6B7]">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-[#2d1b2e]">
            Switch Question Source?
          </h2>
          <p className="text-[#5a3d5c] mb-6 text-sm sm:text-base">
            Switching question source will restart the current quiz. Your progress will be lost. Are you sure you want to proceed?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={cancelSourceChange}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmSourceChange}
              className="bg-[#F4A6B7] hover:bg-[#E8949C] text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Pre-start state
  if (!quizState.quizStarted) {
    return (
      <>
        <ConfirmationModal />
        <div className="max-w-2xl mx-auto px-2 sm:px-6">
          {/* Question Source Toggle */}
          <div className="mb-4 bg-white rounded-lg shadow-lg p-4 border-2 border-[#F4A6B7]">
            <label htmlFor="question-source" className="block text-sm font-semibold text-[#2d1b2e] mb-2">
              Question Source
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleSourceChange('opentdb')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  questionSource === 'opentdb'
                    ? 'bg-[#F4A6B7] text-white'
                    : 'bg-gray-100 text-[#5a3d5c] hover:bg-gray-200'
                }`}
                aria-pressed={questionSource === 'opentdb'}
              >
                General Knowledge (OpenTDB)
              </button>
              <button
                onClick={() => handleSourceChange('farcaster')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                  questionSource === 'farcaster'
                    ? 'bg-[#F4A6B7] text-white'
                    : 'bg-gray-100 text-[#5a3d5c] hover:bg-gray-200'
                }`}
                aria-pressed={questionSource === 'farcaster'}
              >
                Farcaster Knowledge (Local)
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 text-center border-4 border-[#F4A6B7]">
            <div className="mb-6 flex justify-center">
              <Image src="/brain-large.svg" alt="Brain" width={96} height={96} className="w-24 h-24 sm:w-32 sm:h-32" priority />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-[#2d1b2e]">Trivia Challenge</h1>
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
        </div>
      </>
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
      />
    );
  }

  // Active quiz state
  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  const answered = quizState.answers[quizState.currentQuestionIndex] !== null;

  return (
    <>
      <ConfirmationModal />
      <div className="max-w-3xl mx-auto px-2 sm:px-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm sm:text-base text-[#5a3d5c] font-semibold">
          Question {quizState.currentQuestionIndex + 1} / {quizState.questions.length}
        </div>
        <div className="flex items-center gap-2">
          <Timer timeRemaining={quizState.timeRemaining} />
          <button
            onPointerUp={() => {
              const audio = audioRef.current;
              if (!audio) return;
              if (!audio.paused) {
                try { audio.pause(); } catch (_) {}
                setIsMusicPlaying(false);
              } else {
                if (sound.disabled) {
                  try { sound.set(false); } catch (_) {}
                }
                try {
                  audio.muted = false;
                  audio.volume = 0.14;
                  const p = audio.play();
                  if (p && typeof p.then === 'function') {
                    p.then(() => setIsMusicPlaying(true)).catch(() => setIsMusicPlaying(false));
                  } else {
                    setIsMusicPlaying(!audio.paused);
                  }
                } catch (_) {
                  setIsMusicPlaying(false);
                }
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
    </>
  );
}
