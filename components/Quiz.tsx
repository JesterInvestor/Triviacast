import React, { useState } from 'react';
import QuizResults from './QuizResults';

type Props = {
  username?: string; // optional Farcaster username to mention
};

/**
 * Minimal Quiz component for integration.
 * Replace your existing quiz logic but ensure you pass username to QuizResults.
 *
 * This sample simulates a quiz and demonstrates passing `username` down to the results component.
 */
export default function Quiz({ username }: Props) {
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [tPoints, setTPoints] = useState<number>(0);

  function simulateFinish() {
    // Replace this with your real scoring logic
    const simulatedScore = Math.floor(Math.random() * 10) + 1;
    const simulatedT = Math.floor(simulatedScore * 2.5);
    setScore(simulatedScore);
    setTPoints(simulatedT);
    setCompleted(true);
  }

  if (completed) {
    return (
      <QuizResults
        score={score}
        tPoints={tPoints}
        username={username}
        autoOpenPreview={!!username} // auto-open preview only when there is a username (tagging friend)
        onClose={() => setCompleted(false)}
      />
    );
  }

  // Replace below with your full quiz UI
  return (
    <div className="quiz-root">
      <h2>Triviacast Challenge (demo)</h2>
      <p>Answer 5 quick questions (demo mode).</p>
      <button onClick={simulateFinish}>Finish Quiz (simulate)</button>
    </div>
  );
}
