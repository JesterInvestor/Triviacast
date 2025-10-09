'use client';

import { useState, useEffect } from 'react';
import { Question } from '@/types/quiz';

interface QuizQuestionProps {
  question: Question;
  onAnswer: (answer: string) => void;
  answered: boolean;
}

function decodeHtml(html: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

export default function QuizQuestion({ question, onAnswer, answered }: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);

  useEffect(() => {
    // Shuffle answers when question changes
    const answers = [...question.incorrect_answers, question.correct_answer];
    const shuffled = answers.sort(() => Math.random() - 0.5);
    setShuffledAnswers(shuffled);
    setSelectedAnswer(null);
  }, [question]);

  const handleAnswerClick = (answer: string) => {
    if (answered) return;
    
    setSelectedAnswer(answer);
    onAnswer(answer);
  };

  const getAnswerClassName = (answer: string) => {
    const baseClass = "w-full p-4 mb-3 rounded-lg border-2 text-left transition-all cursor-pointer ";
    
    if (!selectedAnswer) {
      return baseClass + "border-gray-300 hover:border-blue-500 hover:bg-blue-50";
    }
    
    if (answer === question.correct_answer) {
      return baseClass + "border-green-500 bg-green-100";
    }
    
    if (answer === selectedAnswer) {
      return baseClass + "border-red-500 bg-red-100";
    }
    
    return baseClass + "border-gray-300 bg-gray-100";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-2 text-sm text-gray-500">
        {question.category} - {question.difficulty}
      </div>
      
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">
        {decodeHtml(question.question)}
      </h2>
      
      <div className="space-y-2">
        {shuffledAnswers.map((answer, index) => (
          <button
            key={index}
            onClick={() => handleAnswerClick(answer)}
            disabled={answered}
            className={getAnswerClassName(answer)}
          >
            <span className="font-medium">{String.fromCharCode(65 + index)}.</span>{' '}
            {decodeHtml(answer)}
          </button>
        ))}
      </div>
    </div>
  );
}
