'use client';

import { Question } from '@/types/quiz';

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  questions: Question[];
  answers: (string | null)[];
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
  onRestart 
}: QuizResultsProps) {
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

        <div className="text-center">
          <button
            onClick={onRestart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
