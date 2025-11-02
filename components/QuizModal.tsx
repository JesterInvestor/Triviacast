"use client";

import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (result: { quizId: string; score: number; details?: any }) => void;
};

export default function QuizModal({ open, onClose, onComplete }: Props) {
  const [score, setScore] = useState(0);
  const [quizId] = useState('demo-quiz');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-md p-6 w-11/12 max-w-md">
        <h3 className="text-lg font-semibold mb-4">Demo Quiz</h3>
        <p className="text-sm text-gray-600 mb-3">This is a small demo quiz modal. Use your real quiz UI if you prefer.</p>

        <label className="block text-sm mb-2">Score (0-100)</label>
        <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{score}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded bg-gray-200" onClick={onClose}>Cancel</button>
            <button
              className="px-3 py-1 rounded bg-[#DC8291] text-white"
              onClick={() => {
                onComplete({ quizId, score });
                onClose();
              }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
