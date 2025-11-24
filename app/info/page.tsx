"use client";

import React, { useState } from "react";
import Image from "next/image";
import HiddenMintButton from "@/components/HiddenMintButton";

export default function InfoPage() {
  const DEFAULT_FORM = {
    category: "",
    difficulty: "easy",
    type: "multiple",
    question: "",
    correct_answer: "",
    incorrect_answers: ["", "", ""],
    reference: "",
  };

  const [form, setForm] = useState(DEFAULT_FORM);

  const FARCASTER_MINIAPP = "https://farcaster.xyz/miniapps/UmWywlPILouA/triviacast";
  const FARCASTER_COMPOSE = "https://farcaster.xyz/compose";
  const TRIVIACAST_INFO = "https://triviacast.xyz/info";
  const OPEN_TDB_URL = "https://opentdb.com/trivia_add_question.php";

  const canCast = form.question.trim() !== "" && form.correct_answer.trim() !== "";

  const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

  const buildCastMessage = () => {
    const incorrect = (form.incorrect_answers || [])
      .map((s) => (s || "").trim())
      .filter(Boolean);

    const parts: string[] = [];

    // Updated message format with dynamic answers
    parts.push("🎙️ Triviacast question");
    parts.push(""); // Blank line for readability
    parts.push("Question:");
    parts.push(`${form.question.trim()}`);
    parts.push(""); // Blank line for readability

    parts.push("Answers:");
    const options = [
      `A) ${form.correct_answer}`,
      ...incorrect.map((answer, index) => `${String.fromCharCode(66 + index)}) ${answer}`), // B, C, D
    ];
    parts.push(...options);
    parts.push(""); // Blank line for readability
    parts.push(`✅ Correct answer: A`);
    parts.push(""); // Blank line for readability

    if (form.category) parts.push(`Category: ${form.category}`);
    parts.push(`Difficulty: ${capitalize(form.difficulty)}`);
    if (form.reference) parts.push(`🔎 Reference: ${form.reference}`);
    parts.push("");
    parts.push(`Play or add questions: ${TRIVIACAST_INFO}`);
    parts.push(`Miniapp: ${FARCASTER_MINIAPP}`);
    parts.push("");
    parts.push("— @jesterinvestor");

    return parts.join("\n");
  };

  const composeToFarcaster = async () => {
    if (!canCast) {
      alert("Please fill at least the question and correct answer before composing a share.");
      return;
    }

    const message = buildCastMessage();

    try {
      const anyWindow = window as any;

      if (anyWindow.sdk?.actions?.composeCast) {
        const result = await anyWindow.sdk.actions.composeCast({ text: message, embeds: [TRIVIACAST_INFO] });
        alert(result?.cast ? "Share posted successfully." : "Compose opened — no share was posted.");
        return;
      }

      try {
        const mod = await import("@farcaster/miniapp-sdk");
        if (mod?.sdk?.actions?.composeCast) {
          const result = await mod.sdk.actions.composeCast({ text: message, embeds: [TRIVIACAST_INFO] });
          alert(result?.cast ? "Share posted successfully." : "Compose opened — no share was posted.");
          return;
        }
      } catch (e) {
        // Dynamic import failed, fallback continues
      }

      // Fallback: copy message to clipboard and open Farcaster
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        alert("Message copied to clipboard. Open the Farcaster miniapp to paste or post it.");
      } else {
        alert("Miniapp SDK not available. Please open the Farcaster miniapp and paste the message.");
      }

      window.open(FARCASTER_MINIAPP, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Compose failed", err);
      alert("Failed to open compose. Copy text manually from the form.");
    }
  };

  const openOpenTDB = async () => {
    window.open(OPEN_TDB_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <Image src="/brain-small.svg" alt="Mini Brain" width={48} height={48} />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2d1b2e] text-center">
            Welcome to Triviacast
          </h1>
        </div>

        <div className="mb-6 p-4 bg-white rounded-xl shadow w-full max-w-2xl border">
          <h2 className="text-xl font-bold mb-2 text-purple-600">Add a Trivia Question</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label>
              Category
              <select
                className="mt-1 p-2 border rounded"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Choose category</option>
                <option>General Knowledge</option>
                <option>Science</option>
                <option>Entertainment</option>
              </select>
            </label>

            <label>
              Question
              <textarea
                className="mt-1 p-2 border rounded"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
              />
            </label>
          </div>
          <button onClick={composeToFarcaster}>Compose</button>
        </div>
        <HiddenMintButton />
      </div>
    </div>
  );
}