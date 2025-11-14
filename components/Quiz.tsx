import React, { useEffect, useMemo, useState } from "react";
import baseQuestions from "./farcaster_question.json";
import addendum from "./farcaster_questions_addendum.json";

/**
 * quiz.tsx
 *
 * Full, drop-in React + TypeScript quiz component that:
 * - Imports the existing farcaster_question.json and the addendum file
 * - Merges and deduplicates questions (preferring the later file on ID conflict)
 * - Optionally shuffles questions
 * - Tracks per-session score and shows immediate feedback
 *
 * NOTES:
 * - Make sure tsconfig.json includes "resolveJsonModule": true and "esModuleInterop": true
 * - Place this file alongside the two JSON files or update the import paths accordingly
 */

type Choices = Record<string, string>;

type Question = {
  id: number;
  question: string;
  choices: Choices;
  answer: string; // "A" | "B" | "C" | "D"
};

const dedupeAndCombine = (a: Question[], b: Question[]) => {
  const map = new Map<number, Question>();
  // Prefer items from `a` first, then override with `b` if same id appears in addendum.
  for (const q of a) map.set(q.id, q);
  for (const q of b) map.set(q.id, q);
  // Return by ascending id for stable ordering
  return Array.from(map.values()).sort((x, y) => x.id - y.id);
};

const shuffleArray = <T,>(arr: T[], seed?: number) => {
  // Fisher-Yates shuffle. If seed provided, use a simple LCG to pseudo-randomize deterministically.
  let a = arr.slice();
  let rand = ((): (() => number) => {
    if (seed === undefined) return () => Math.random();
    let s = seed >>> 0;
    return () => {
      // simple LCG
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  })();

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function Quiz() {
  // Merge and dedupe base + addendum
  const mergedQuestions = useMemo<Question[]>(
    () => dedupeAndCombine((baseQuestions as unknown) as Question[], (addendum as unknown) as Question[]),
    []
  );

  // UI state
  const [shuffled, setShuffled] = useState<boolean>(true);
  const [seed, setSeed] = useState<number | undefined>(undefined); // deterministic shuffle if set
  const displayedQuestions = useMemo<Question[]>(
    () => (shuffled ? shuffleArray(mergedQuestions, seed) : mergedQuestions),
    [mergedQuestions, shuffled, seed]
  );

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState<Record<number, { chosen: string; correct: boolean }>>({});

  useEffect(() => {
    // Reset session when shuffle or seed changes
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAttempted({});
  }, [shuffled, seed, mergedQuestions.length]);

  if (!displayedQuestions || displayedQuestions.length === 0) {
    return <div>No questions found. Ensure farcaster_question.json and farcaster_questions_addendum.json are present and valid.</div>;
  }

  const q = displayedQuestions[index];

  function submitAnswer() {
    if (!selected) return;
    const correct = selected === q.answer;
    setAttempted((s) => ({ ...s, [q.id]: { chosen: selected, correct } }));
    if (correct) setScore((s) => s + 1);
  }

  function nextQuestion() {
    setSelected(null);
    if (index < displayedQuestions.length - 1) {
      setIndex((i) => i + 1);
    }
  }

  function prevQuestion() {
    setSelected(null);
    if (index > 0) setIndex((i) => i - 1);
  }

  function revealAnswerText(question: Question) {
    return `${question.answer}: ${question.choices[question.answer] ?? ""}`;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2>Farcaster Trivia Quiz</h2>
        <div>
          <strong>
            Score: {score} / {Object.keys(attempted).length}
          </strong>
        </div>
      </header>

      <section style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <label>
          <input
            type="checkbox"
            checked={shuffled}
            onChange={(e) => setShuffled(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Shuffle questions
        </label>

        <label style={{ marginLeft: 8 }}>
          Seed:
          <input
            type="number"
            value={seed ?? ""}
            onChange={(e) => setSeed(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder="optional"
            style={{ marginLeft: 6, width: 120 }}
          />
        </label>

        <div style={{ marginLeft: "auto", fontSize: 14, color: "#555" }}>
          Question {index + 1} of {displayedQuestions.length} (ID: {q.id})
        </div>
      </section>

      <article style={{ border: "1px solid #e6e6e6", borderRadius: 8, padding: 16 }}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>{q.question}</p>

        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {Object.entries(q.choices).map(([key, text]) => {
            const attemptedForThis = attempted[q.id];
            const isChosen = selected === key;
            const alreadyAnswered = attemptedForThis !== undefined;
            const correctKey = q.answer;
            const bg =
              alreadyAnswered && attemptedForThis.chosen === key
                ? attemptedForThis.correct
                  ? "#d4f8d4"
                  : "#ffd6d6"
                : isChosen
                ? "#eef2ff"
                : "transparent";
            return (
              <li key={key} style={{ marginBottom: 8 }}>
                <label
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 6,
                    background: bg,
                    border: "1px solid #ddd",
                    cursor: alreadyAnswered ? "default" : "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={key}
                    checked={isChosen}
                    onChange={() => setSelected(key)}
                    disabled={alreadyAnswered}
                    style={{ marginRight: 8 }}
                  />
                  <strong>{key}.</strong> <span style={{ marginLeft: 8 }}>{text}</span>
                  {alreadyAnswered && attemptedForThis.chosen === key && (
                    <span style={{ marginLeft: 10, fontWeight: 600, color: attemptedForThis.correct ? "green" : "crimson" }}>
                      {attemptedForThis.correct ? " ✓ Correct" : " ✕ Incorrect"}
                    </span>
                  )}
                  {alreadyAnswered && correctKey === key && (
                    <span style={{ marginLeft: 8, fontSize: 13, color: "green" }}> (Answer)</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={() => {
              submitAnswer();
            }}
            disabled={selected === null || attempted[q.id] !== undefined}
            style={{ padding: "8px 12px", cursor: selected === null ? "not-allowed" : "pointer" }}
          >
            Submit
          </button>

          <button
            onClick={() => {
              // If already attempted, allow moving on but don't change score
              if (attempted[q.id] === undefined && selected) submitAnswer();
              nextQuestion();
            }}
            style={{ padding: "8px 12px" }}
            disabled={index >= displayedQuestions.length - 1}
          >
            Next
          </button>

          <button onClick={prevQuestion} style={{ padding: "8px 12px" }} disabled={index === 0}>
            Prev
          </button>

          <button
            onClick={() => {
              // reveal correct answer in UI by marking attempted (but not affecting score)
              if (attempted[q.id] === undefined) {
                setAttempted((s) => ({ ...s, [q.id]: { chosen: "_revealed", correct: false } }));
              }
            }}
            style={{ marginLeft: "auto", padding: "8px 12px" }}
          >
            Reveal Answer
          </button>
        </div>
      </article>

      <footer style={{ marginTop: 12, color: "#666", fontSize: 14 }}>
        <div>
          Completed: {Object.keys(attempted).length} / {displayedQuestions.length} — Score: {score}
        </div>
        <div style={{ marginTop: 8 }}>
          Tip: Enable resolveJsonModule in tsconfig.json if imports fail.
          <div style={{ marginTop: 6 }}>
            If you want me to push this file and the addendum directly into your repository, tell me the repo (owner/name)
            and the branch, and I will create a PR with these changes.
          </div>
        </div>
      </footer>
    </div>
  );
}
