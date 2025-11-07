"use client";

import React, { useEffect, useRef, useState } from 'react';
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
  const [isMuted, setIsMuted] = useState(false);
  const { address: accountAddress, isConnected } = useAccount();
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
      // Request easy and medium questions explicitly
      const response = await fetch('/api/questions?amount=10&difficulty=easy,medium');
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

  // Background music lifecycle: create audio when quiz starts, loop, allow mute toggle.
  useEffect(() => {
    // Only create/play while quiz is active
    if (quizState.quizStarted && !quizState.quizCompleted) {
      if (!audioRef.current) {
        const audio = new Audio('/giggly-bubbles-222533.mp3');
        audio.loop = true;
        audio.volume = isMuted ? 0 : 0.14; // lower background volume
        audioRef.current = audio;
      } else {
        audioRef.current.volume = isMuted ? 0 : 0.14;
      }

      // Attempt to play; if autoplay is blocked, ignore the error (user can start via interaction)
      const playPromise = audioRef.current.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {
          // Autoplay prevented; do nothing (mute control available)
        });
      }
    }

    // Pause/cleanup when quiz ends
    if (quizState.quizCompleted && audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (_) {}
    }

    return () => {
      // If component unmounts, stop audio
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current = null;
        } catch (_) {
          audioRef.current = null;
        }
      }
    };
  }, [quizState.quizStarted, quizState.quizCompleted, isMuted]);

  // Call onComplete callback when quiz is completed
  useEffect(() => {
    if (quizState.quizCompleted && onComplete) {
      // Generate a simple quizId (could be timestamp-based or UUID in production)
      const quizId = `quiz-${Date.now()}`;
      onComplete({
        quizId,
        score: quizState.score,
        details: {
          totalQuestions: quizState.questions.length,
          tPoints: quizState.tPoints,
          answers: quizState.answers,
          questions: quizState.questions,
        },
      });
    }
  }, [quizState.quizCompleted, quizState.score, quizState.tPoints, quizState.answers, quizState.questions, onComplete]);

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

  // Pre-start state
  if (!quizState.quizStarted) {
    return (
      <div className="max-w-2xl mx-auto px-2 sm:px-6">
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
          {!isConnected || !accountAddress ? (
            <div className="mb-4 p-4 bg-[#FFE4EC] border-2 border-[#F4A6B7] text-[#5a3d5c] rounded-lg text-sm sm:text-base">
              🔒 Connect your wallet silly
            </div>
          ) : null}
          {error && (
            <div className="mb-4 p-4 bg-[#FFE4EC] border-2 border-[#DC8291] text-[#C86D7D] rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}
          <button
            onClick={startQuiz}
            disabled={loading || !isConnected || !accountAddress}
            aria-disabled={loading || !isConnected || !accountAddress}
            className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-4 px-8 rounded-lg text-lg transition disabled:opacity-50 shadow-lg w-full sm:w-auto min-h-[56px]"
          >
            {loading ? 'Loading...' : 'Start Quiz'}
          </button>
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
            onClick={() => setIsMuted((m) => !m)}
            className="px-3 py-2 text-sm rounded-lg bg-white border-2 border-[#F4A6B7] text-[#5a3d5c] shadow"
            aria-pressed={isMuted}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      </div>

      <QuizQuestion question={currentQuestion} onAnswer={handleAnswer} answered={answered} />
    </div>
  );
}
