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
    const baseClass = "w-full p-4 sm:p-4 mb-3 rounded-lg border-2 text-left transition-all cursor-pointer font-medium min-h-[56px] flex items-center ";
    
    if (!selectedAnswer) {
      return baseClass + "border-[#F4A6B7] hover:border-[#E8949C] active:bg-[#FFE4EC] hover:bg-[#FFE4EC] text-[#2d1b2e] bg-white shadow-md hover:shadow-lg active:shadow-xl";
    }
    
    if (answer === question.correct_answer) {
      return baseClass + "border-green-500 bg-green-100 text-green-900 shadow-lg";
    }
    
    if (answer === selectedAnswer) {
      return baseClass + "border-red-500 bg-red-100 text-red-900 shadow-lg";
    }
    
    return baseClass + "border-[#FFC4D1] bg-[#FFE4EC] text-[#5a3d5c] shadow";
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 border-4 border-[#F4A6B7]">
      <div className="mb-2 text-xs sm:text-sm text-[#8b6b8d] font-semibold uppercase tracking-wide">
        {question.category} - {question.difficulty}
      </div>
      
      <h2 className="text-lg sm:text-2xl font-semibold mb-4 sm:mb-6 text-[#2d1b2e] leading-relaxed">
        {decodeHtml(question.question)}
      </h2>
      
      <div className="space-y-3">
        {shuffledAnswers.map((answer, index) => (
          <button
            key={index}
            onClick={() => handleAnswerClick(answer)}
            disabled={answered}
            className={getAnswerClassName(answer)}
          >
            <span className="font-bold text-[#F4A6B7] mr-2">{String.fromCharCode(65 + index)}.</span>
            <span className="flex-1 text-left">{decodeHtml(answer)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
