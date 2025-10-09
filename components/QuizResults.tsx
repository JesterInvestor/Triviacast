'use client';

import { useState } from 'react';
import { Question } from '@/types/quiz';
import { addToLeaderboard, addUserTPoints } from '@/lib/tpoints';
import Link from 'next/link';

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  questions: Question[];
  answers: (string | null)[];
  tPoints: number;
  onRestart: () => void;
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
  onRestart 
}: QuizResultsProps) {
  const [userName, setUserName] = useState('');
  const [saved, setSaved] = useState(false);
  const percentage = Math.round((score / totalQuestions) * 100);
  
  const getResultMessage = () => {
    if (percentage >= 80) return "Excellent! 🎉";
    if (percentage >= 60) return "Great job! 👏";
    if (percentage >= 40) return "Good effort! 👍";
    return "Keep practicing! 💪";
  };

  const getResultColor = () => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const handleSaveScore = () => {
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    addToLeaderboard(userName.trim(), tPoints);
    addUserTPoints(tPoints);
    setSaved(true);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-4 text-center text-gray-800">
          Quiz Complete!
        </h2>
        
        <div className="text-center mb-8">
          <div className={`text-6xl font-bold mb-2 ${getResultColor()}`}>
            {score}/{totalQuestions}
          </div>
          <div className="text-2xl text-gray-600 mb-2">
            {percentage}% Correct
          </div>
          <div className="text-xl font-semibold text-gray-700">
            {getResultMessage()}
          </div>
          
          <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border-2 border-yellow-300">
            <div className="text-3xl font-bold text-amber-600 mb-2">
              🏆 {tPoints.toLocaleString()} T Points Earned!
            </div>
            <div className="text-sm text-gray-600">
              • 1000 T points per correct answer<br/>
              • 500 bonus for 3 in a row<br/>
              • 1000 bonus for 5 in a row<br/>
              • 2000 bonus for perfect 10!
            </div>
          </div>

          {!saved && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-lg font-semibold mb-3 text-gray-800">Save to Leaderboard</h4>
              <div className="flex gap-2 justify-center items-center">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={20}
                />
                <button
                  onClick={handleSaveScore}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
                >
                  Save Score
                </button>
              </div>
            </div>
          )}

          {saved && (
            <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              ✓ Score saved to leaderboard!
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Review Answers:</h3>
          <div className="space-y-4">
            {questions.map((question, index) => {
              const userAnswer = answers[index];
              const isCorrect = userAnswer === question.correct_answer;
              
              return (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  <div className="flex items-start">
                    <span className="font-bold mr-2">Q{index + 1}.</span>
                    <div className="flex-1">
                      <div className="font-medium mb-2 text-gray-800">
                        {decodeHtml(question.question)}
                      </div>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-semibold">Your answer: </span>
                          <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {userAnswer ? decodeHtml(userAnswer) : 'No answer'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div>
                            <span className="font-semibold">Correct answer: </span>
                            <span className="text-green-700">
                              {decodeHtml(question.correct_answer)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {isCorrect ? (
                        <span className="text-2xl">✓</span>
                      ) : (
                        <span className="text-2xl">✗</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center flex gap-4 justify-center">
          <button
            onClick={onRestart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition"
          >
            Try Again
          </button>
          <Link
            href="/leaderboard"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition inline-block"
          >
            View Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
