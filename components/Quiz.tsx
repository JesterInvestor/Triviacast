'use client';

import { useState, useEffect, useRef } from 'react';
import { Question, QuizState } from '@/types/quiz';
import QuizQuestion from './QuizQuestion';
import QuizResults from './QuizResults';
import Timer from './Timer';
import { calculateTPoints } from '@/lib/tpoints';
import { useActiveAccount } from 'thirdweb/react';

const QUIZ_TIME_LIMIT = 60; // 1 minute in seconds
const TIME_PER_QUESTION = 6; // ~6 seconds per question (informational only)

export default function Quiz() {
  const account = useActiveAccount();
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
    
    try {
      const response = await fetch('/api/questions?amount=10&difficulty=medium');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
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

  useEffect(() => {
    if (!quizState.quizStarted || quizState.quizCompleted) return;

    const timer = setInterval(() => {
      setQuizState(prev => {
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
        audio.volume = 0.14; // lower background volume
        audioRef.current = audio;
      }

      // Attempt to play; if autoplay is blocked, ignore the error (user can start via interaction)
      const playPromise = audioRef.current.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {
          // Autoplay prevented; do nothing (we removed the mute control)
        });
      }
    }

    // Pause/cleanup when quiz ends
    if (quizState.quizCompleted && audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch (_) {}
    }

    return () => {
      // If component unmounts, stop audio
      if (audioRef.current) {
        try { audioRef.current.pause(); audioRef.current = null; } catch (_) { audioRef.current = null; }
      }
    };
  }, [quizState.quizStarted, quizState.quizCompleted]);

  const handleAnswer = (answer: string) => {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correct_answer;
    
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestionIndex] = answer;
    
    setQuizState(prev => {
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
      if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
        setQuizState(prev => ({
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
        }));
      } else {
        setQuizState(prev => ({ ...prev, quizCompleted: true }));
      }
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

  if (!quizState.quizStarted) {
    return (
      <div className="max-w-2xl mx-auto px-2 sm:px-6">
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 text-center border-4 border-[#F4A6B7]">
          <div className="mb-6 flex justify-center">
            <img src="/brain-large.svg" alt="Brain" className="w-24 h-24 sm:w-32 sm:h-32" loading="eager" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-[#2d1b2e]">Quiz Challenge</h1>
          <p className="text-[#5a3d5c] mb-8 text-base sm:text-lg">
            Only 1 minute.<br />
            10 questions.<br />
            Endless bragging rights.<br />
            Ready to prove you're a genius? 🧠
          </p>
          {!account?.address && (
            <div className="mb-4 p-4 bg-[#FFE4EC] border-2 border-[#F4A6B7] text-[#5a3d5c] rounded-lg text-sm sm:text-base">
              🔒 Please connect your wallet to start the quiz
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 bg-[#FFE4EC] border-2 border-[#DC8291] text-[#C86D7D] rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}
          <button
            onClick={startQuiz}
            disabled={loading || !account?.address}
            className="bg-[#F4A6B7] hover:bg-[#E8949C] active:bg-[#DC8291] text-white font-bold py-4 px-8 rounded-lg text-lg transition disabled:opacity-50 shadow-lg w-full sm:w-auto min-h-[56px]"
          >
            {loading ? 'Loading...' : 'Start Quiz'}
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-6">
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
        <div className="text-[#2d1b2e] font-semibold flex items-center gap-2 text-sm sm:text-base">
          <img src="/brain-small.svg" alt="Brain" className="w-6 h-6 sm:w-8 sm:h-8" loading="lazy" />
          Question {quizState.currentQuestionIndex + 1} of {quizState.questions.length}
        </div>
        <div className="flex items-center gap-2">
          <Timer timeRemaining={quizState.timeRemaining} />
        </div>
      </div>
      
      <div className="mb-4">
        <div className="w-full bg-[#FFE4EC] rounded-full h-2 sm:h-3 shadow-inner">
          <div
            className="quiz-progress-bar bg-gradient-to-r from-[#F4A6B7] to-[#E8949C] h-2 sm:h-3 rounded-full transition-all shadow-md"
            style={{
              width: `${((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <QuizQuestion
        question={quizState.questions[quizState.currentQuestionIndex]}
        onAnswer={handleAnswer}
        answered={quizState.answers[quizState.currentQuestionIndex] !== null}
      />
      
      <div className="mt-4 text-center text-[#2d1b2e] font-semibold text-base sm:text-lg">
        Score: {quizState.score} / {quizState.currentQuestionIndex + (quizState.answers[quizState.currentQuestionIndex] !== null ? 1 : 0)}
      </div>
    </div>
  );
}