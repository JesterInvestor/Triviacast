'use client';

import { useState, useEffect } from 'react';
import { Question, QuizState } from '@/types/quiz';
import QuizQuestion from './QuizQuestion';
import QuizResults from './QuizResults';
import Timer from './Timer';

const QUIZ_TIME_LIMIT = 300; // 5 minutes in seconds
const TIME_PER_QUESTION = 30; // 30 seconds per question

export default function Quiz() {
  const [quizState, setQuizState] = useState<QuizState>({
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    timeRemaining: QUIZ_TIME_LIMIT,
    quizStarted: false,
    quizCompleted: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleAnswer = (answer: string) => {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correct_answer;
    
    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentQuestionIndex] = answer;
    
    setQuizState(prev => ({
      ...prev,
      answers: newAnswers,
      score: isCorrect ? prev.score + 1 : prev.score,
    }));

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
    });
    setError(null);
  };

  if (!quizState.quizStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">Quiz Challenge</h1>
          <p className="text-gray-600 mb-8">
            Test your knowledge with 10 trivia questions. You have 5 minutes to complete the quiz!
          </p>
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <button
            onClick={startQuiz}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition disabled:opacity-50"
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
        onRestart={restartQuiz}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="text-gray-700">
          Question {quizState.currentQuestionIndex + 1} of {quizState.questions.length}
        </div>
        <Timer timeRemaining={quizState.timeRemaining} />
      </div>
      
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
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
      
      <div className="mt-4 text-center text-gray-600">
        Score: {quizState.score} / {quizState.currentQuestionIndex + (quizState.answers[quizState.currentQuestionIndex] !== null ? 1 : 0)}
      </div>
    </div>
  );
}
