"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * components/Quiz.tsx
 *
 * Client-side quiz component that loads a single JSON question bank at runtime:
 *   public/farcaster_questions.json
 *
 * Requirements:
 * - You said you added all questions to farcaster_questions.json — place that file in your project's public/
 *   folder so it is served at: /farcaster_questions.json
 * - The file must be a JSON array of question objects with this shape:
 *     { id: number, question: string, choices: { A: string, B: string, C: string, D: string }, answer: "A"|"B"|"C"|"D" }
 *
 * Behavior:
 * - Fetches /farcaster_questions.json on mount (client-side), validates the array, and requires it when
 *   mode === "farcaster" (shows error UI if fetch/validation fails).
 * - No embedded fallback data is used (per your request).
 * - Supports optional deterministic shuffle via seed, per-question submission, immediate feedback, and simple navigation.
 */

type Choices = Record<string, string>;

type Question = {
  id: number;
  question: string;
  choices: Choices;
  answer: string;
};

const FETCH_TIMEOUT_MS = 4000;

function timeoutPromise<T>(ms: number, p: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(t);
        reject(err);
      });
  });
}

async function fetchQuestions(path: string): Promise<Question[] | null> {
  try {
    const res = await timeoutPromise(FETCH_TIMEOUT_MS, fetch(path));
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    const valid = data.every(
      (it: any) =>
        it &&
        typeof it.id === "number" &&
        typeof it.question === "string" &&
        it.choices &&
        typeof it.choices === "object" &&
        typeof it.answer === "string"
    );
    if (!valid) return null;
    return data as Question[];
  } catch {
    return null;
  }
}

const shuffleArray = <T,>(arr: T[], seed?: number) => {
  const a = arr.slice();
  let rand = Math.random;
  if (seed !== undefined) {
    let s = seed >>> 0;
    rand = () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function Quiz({ mode = "farcaster" }: { mode?: "farcaster" | "default" }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [shuffled, setShuffled] = useState(true);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState<Record<number, { chosen: string; correct: boolean }>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const fetched = await fetchQuestions("/farcaster_questions.json");

      if (cancelled) return;

      if (!fetched) {
        setError(
          "Failed to load /farcaster_questions.json. Ensure the file exists in public/farcaster_questions.json and is a valid JSON array of questions."
        );
        setLoading(false);
        return;
      }

      // If in strict farcaster mode, require 200 questions (IDs 1..200 assumed)
      if (mode === "farcaster" && fetched.length < 200) {
        setError(
          `Loaded ${fetched.length} questions but farcaster mode expects all 200 questions present in farcaster_questions.json.`
        );
        // Still set the loaded questions so user can test; but surface explicit error
        setQuestions(fetched);
        setLoading(false);
        return;
      }

      setQuestions(fetched);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const displayed = useMemo(() => {
    if (!questions) return [];
    return shuffled ? shuffleArray(questions, seed) : questions;
  }, [questions, shuffled, seed]);

  useEffect(() => {
    // reset when questions change or shuffle config changes
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAttempted({});
  }, [questions, shuffled, seed]);

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Farcaster Quiz</h2>
        <p>Loading questions...</p>
      </div>
    );
  }

  if (error && !questions) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Farcaster Quiz — Error</h2>
        <p style={{ color: "crimson" }}>{error}</p>
        <div style={{ marginTop: 12 }}>
          Checklist:
          <ul>
            <li>Place the file at: <code>public/farcaster_questions.json</code></li>
            <li>Ensure it's a JSON array of objects: id, question, choices, answer</li>
            <li>For full farcaster mode, include all 200 questions (IDs 1–200)</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!questions || displayed.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Farcaster Quiz</h2>
        <p>No questions were loaded. Ensure /farcaster_questions.json is reachable and valid.</p>
      </div>
    );
  }

  const q = displayed[index];
  const tried = attempted[q.id];

  function submitAnswer() {
    if (!selected) return;
    const correct = selected === q.answer;
    setAttempted((s) => ({ ...s, [q.id]: { chosen: selected!, correct } }));
    if (correct) setScore((s) => s + 1);
  }

  function nextQuestion() {
    setSelected(null);
    if (index < displayed.length - 1) setIndex((i) => i + 1);
  }

  function prevQuestion() {
    setSelected(null);
    if (index > 0) setIndex((i) => i - 1);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{mode === "farcaster" ? "Farcaster Knowledge Quiz" : "Trivia Quiz"}</h2>
        <div style={{ textAlign: "right" }}>
          <div>Loaded questions: <strong>{displayed.length}</strong></div>
          <div>Score: <strong>{score}</strong> / <strong>{Object.keys(attempted).length}</strong></div>
        </div>
      </header>

      {error && (
        <div style={{ marginTop: 12, color: "orange" }}>
          <strong>Note:</strong> {error}
        </div>
      )}

      <section style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <label>
          <input type="checkbox" checked={shuffled} onChange={(e) => setShuffled(e.target.checked)} /> Shuffle
        </label>
        <label>
          Seed:
          <input
            type="number"
            value={seed ?? ""}
            onChange={(e) => setSeed(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder="optional"
            style={{ marginLeft: 8, width: 120 }}
          />
        </label>
        <div style={{ marginLeft: "auto", color: "#666" }}>
          {index + 1} / {displayed.length} (ID: {q.id})
        </div>
      </section>

      <article style={{ marginTop: 12, border: "1px solid #eee", padding: 16, borderRadius: 8 }}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>{q.question}</p>
        <ul style={{ listStyle: "none", paddingLeft: 0 }}>
          {Object.entries(q.choices).map(([k, v]) => {
            const isSelected = selected === k;
            const bg = tried ? (tried.chosen === k ? (tried.correct ? "#e6ffed" : "#ffecec") : "transparent") : isSelected ? "#eef2ff" : "transparent";
            return (
              <li key={k} style={{ marginBottom: 8 }}>
                <label style={{ display: "block", padding: 10, borderRadius: 6, border: "1px solid #ddd", background: bg, cursor: tried ? "default" : "pointer" }}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={k}
                    checked={isSelected}
                    onChange={() => setSelected(k)}
                    disabled={!!tried}
                    style={{ marginRight: 8 }}
                  />
                  <strong>{k}.</strong> <span style={{ marginLeft: 8 }}>{v}</span>
                  {tried && tried.chosen === k && (
                    <span style={{ marginLeft: 10, color: tried.correct ? "green" : "crimson", fontWeight: 600 }}>
                      {tried.correct ? " ✓ Correct" : " ✕ Incorrect"}
                    </span>
                  )}
                  {tried && q.answer === k && <span style={{ marginLeft: 8, color: "green" }}> (Answer)</span>}
                </label>
              </li>
            );
          })}
        </ul>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={submitAnswer} disabled={!selected || !!tried} style={{ padding: "8px 12px" }}>Submit</button>
          <button onClick={() => { if (!tried && selected) submitAnswer(); nextQuestion(); }} disabled={index >= displayed.length - 1} style={{ padding: "8px 12px" }}>Next</button>
          <button onClick={prevQuestion} disabled={index === 0} style={{ padding: "8px 12px" }}>Prev</button>
          <button onClick={() => { if (!tried) setAttempted((s) => ({ ...s, [q.id]: { chosen: "_revealed", correct: false } })); }} style={{ marginLeft: "auto", padding: "8px 12px" }}>Reveal Answer</button>
        </div>
      </article>

      <footer style={{ marginTop: 16, color: "#666", fontSize: 13 }}>
        This quiz fetches questions at runtime from <code>/farcaster_questions.json</code>. Make sure that file is deployed into your site's public/ directory.
      </footer>
    </div>
  );
}
