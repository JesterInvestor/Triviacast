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
    incorrect_answers: "",
  };

  const [form, setForm] = useState(DEFAULT_FORM);

  const exportToFile = () => {
    try {
      const incorrect = form.incorrect_answers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        category: form.category,
        difficulty: form.difficulty,
        type: form.type,
        question: form.question,
        correct_answer: form.correct_answer,
        incorrect_answers: incorrect,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `opentdb_question_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // graceful no-op in UI; could add toast later
      // eslint-disable-next-line no-console
      console.error("Failed to export question:", err);
    }
  };

  const FARCASTER_MINIAPP = "https://farcaster.xyz/miniapps/UmWywlPILouA/triviacast";

  const canCast = form.question.trim() !== "" && form.correct_answer.trim() !== "";

  const castToFarcaster = async () => {
    if (!canCast) {
      // simple guard
      // eslint-disable-next-line no-alert
      alert("Please fill at least the question and correct answer before casting.");
      return;
    }

    const incorrect = form.incorrect_answers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const message = `Triviacast question: ${form.question}\nCorrect: ${form.correct_answer}\nIncorrect: ${incorrect.join(", ")}\n@jesterinvestor ${FARCASTER_MINIAPP}`;

    try {
      // Copy to clipboard so user can paste if the miniapp doesn't accept prefilled text
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      }
    } catch (err) {
      // ignore clipboard failures
      // eslint-disable-next-line no-console
      console.error("Clipboard write failed", err);
    }

    // Try opening the miniapp with prefilled text param (best-effort)
    const url = `${FARCASTER_MINIAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");

    // Inform the user that the message was copied
    // eslint-disable-next-line no-alert
    alert("Cast message copied to clipboard and opening Farcaster miniapp. If the message is not prefilled, paste it into the miniapp to post.");
  };

  const OPEN_TDB_URL = "https://opentdb.com/trivia_add_question.php";

  const openOpenTDB = async () => {
    // Prepare payload similar to OpenTDB form fields
    const incorrect = form.incorrect_answers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      category: form.category,
      difficulty: form.difficulty,
      type: form.type,
      question: form.question,
      correct_answer: form.correct_answer,
      incorrect_answers: incorrect,
    };

    const message = `OpenTDB question payload:\n${JSON.stringify(payload, null, 2)}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Clipboard write failed", err);
    }

    // Open OpenTDB add question page in new tab. User should paste the payload into the form manually.
    window.open(OPEN_TDB_URL, "_blank", "noopener,noreferrer");

    // Inform the user what to do next
    // eslint-disable-next-line no-alert
    alert("Prepared OpenTDB payload copied to clipboard. The OpenTDB add question page is opening — paste the payload into the appropriate fields.");
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        {/* Mini brain icon and header */}
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
            <Image
              src="/brain-small.svg"
              alt="Mini Brain"
              width={48}
              height={48}
              className="drop-shadow-lg sm:w-[56px] sm:h-[56px] mx-auto"
              style={{ marginBottom: "0.5rem" }}
            />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2d1b2e] text-center">
              Welcome to Triviacast
            </h1>
            <p className="text-xs sm:text-sm text-[#5a3d5c] text-center">
              Your brain powered party on Farcaster
            </p>
          </div>
        </div>

        <div className="mb-4 text-lg text-gray-800 text-center">
          <strong>Triviacast</strong> is not just a trivia game. It is a place to test speed memory and wit while you earn bragging rights and on chain rewards. Connect your wallet show your Farcaster profile and climb the leaderboard. Every question is open source and crafted to be fair fun and fast.
        </div>

        <div className="mb-4 text-lg text-fuchsia-800 font-semibold text-center">
          🚀 Connect with Farcaster and your Base wallet to unlock the full Triviacast experience
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-pink-100 to-blue-100 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-purple-600">How to Play</h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>Connect your Base wallet no brain wallet required</li>
            <li>Answer timed trivia drawn from open source sets Speed and accuracy score you higher</li>
            <li>Earn T Points for correct answers and win bonus points for streaks</li>
            <li>See your Farcaster profile and avatar on the leaderboard in real time</li>
            <li>Claim your rewards on chain and show off your trivia skill</li>
            <li>Challenge friends or climb solo to prove you are the fastest thinker in the room</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-white rounded-xl shadow w-full max-w-2xl border">
          <h2 className="text-xl font-bold mb-2 text-purple-600">How to Challenge a Friend</h2>
          <p className="text-gray-700">Want to dare a friend. Here is the quick flow</p>
          <ol className="list-decimal pl-6 text-gray-700 mt-2">
            <li>Open the Challenge page and search for your friend by Farcaster handle</li>
            <li>Select their profile and click Play Quiz</li>
            <li>After you finish the quiz you will see a preview message that mentions them edit it if you want</li>
            <li>Post the cast from your account using Base or Farcaster or copy the message to share manually</li>
            <li>Your friend will be mentioned in the cast and the challenge begins May the best brain win</li>
          </ol>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-yellow-700">Did You Know</h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>The fastest answer ever recorded on Triviacast was 0.042 seconds of raw render speed and reflex</li>
            <li>Our leaderboard is powered by neynar so you see handles and avatars not boring addresses</li>
            <li>Every T Point you earn is a badge of honor and a ticket to bigger events</li>
            <li>We fetch Farcaster profiles in bulk to keep the leaderboard looking sharp and current</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-blue-700">Quests and Jackpot</h2>
          <p className="text-gray-700">Quests are live and growing. Complete daily challenges and event quests to earn bonus T Points and unique status. Quests are collections of questions that reward speed accuracy and persistence.</p>
          <ul className="list-disc pl-6 text-gray-700 mt-2">
            <li>Daily Quest complete a short set of questions every day to earn bonus T Points</li>
            <li>Weekly Quest finish a longer challenge for rare rewards and leaderboard boosts</li>
            <li>Event Quest show up for limited time themed quizzes with special prizes</li>
            <li>Jackpot coming soon for top players and quest masters Stay tuned for the official launch on Warpcast and in app</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-purple-700 flex items-center gap-2">
            <Image src="/brain-small.svg" alt="Brain" width={24} height={24} />
            About T Points
          </h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>Earn 1000 T Points for each correct answer</li>
            <li>Hit three in a row for a 500 bonus</li>
            <li>Hit five in a row for a 1000 bonus</li>
            <li>Perfect ten in a row for a 2000 bonus and eternal bragging rights</li>
            <li>T Points unlock quests boosts and eligibility for token drops and jackpot events</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-orange-700 flex items-center gap-2">
            <Image src="/brain-small.svg" alt="Brain" width={24} height={24} />
            About $TRIV
          </h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>$TRIV is the native token contract address 0xa889A10126024F39A0ccae31D09C18095CB461B8</li>
            <li>Claim $TRIV when the app prompts you to do so</li>
            <li className="font-bold text-orange-600">Top T Point holders will be eligible for major airdrops and jackpot prize pools</li>
            <li className="text-sm italic">You will be able to buy $TRIV with swaps in app when liquidity is available</li>
            <li className="text-sm italic">Jackpot details will drop soon and will reward the biggest trivia champions</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-fuchsia-50 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-fuchsia-700">Connect and Cast</h2>
          <p className="text-gray-700">
            Cast to{" "}
            <a
              href="https://warpcast.com/jesterinvestor"
              className="text-fuchsia-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              @jesterinvestor
            </a>{" "}
            with a quick message after a great quiz show or share a hot take from your profile
          </p>
          <p className="mt-2 text-gray-700">Got a trivia fact idea feature request or a perfect meme. Cast it our way and we may feature it in a quest.</p>
        </div>

        <div className="mb-6 p-4 bg-white rounded-xl shadow w-full max-w-2xl border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold mb-1 text-[#2d1b2e]">Support Triviacast</h2>
            <p className="text-sm text-[#5a3d5c]">If you enjoy the game you can tip in crypto to help us build more features and bigger events.</p>
          </div>
          <a
            href="https://tip.md/jesterinvestor"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Tip in Crypto"
            className="inline-flex items-center border-2 border-[#F4A6B7] rounded-lg p-1.5 bg-white shadow min-h-[40px]"
          >
            <img src="https://tip.md/badge.svg" alt="Tip in Crypto" height={24} />
          </a>
        </div>

        {/* OpenTDB-like Add Question form */}
        <div className="mb-6 p-4 bg-white rounded-xl shadow w-full max-w-2xl border">
          <h2 className="text-xl font-bold mb-2 text-purple-600">Add a Trivia Question (OpenTDB format)</h2>
          <p className="text-sm text-gray-600 mb-3">Fill the fields and export a JSON file compatible with OpenTDB question format.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col text-sm text-gray-700">
              Category
              <input
                className="mt-1 p-2 border rounded"
                name="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Science: Computers"
              />
            </label>

            <label className="flex flex-col text-sm text-gray-700">
              Difficulty
              <select
                className="mt-1 p-2 border rounded"
                name="difficulty"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <label className="flex flex-col text-sm text-gray-700">
              Type
              <select
                className="mt-1 p-2 border rounded"
                name="type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="multiple">Multiple Choice</option>
                <option value="boolean">True / False</option>
              </select>
            </label>

            <label className="flex flex-col text-sm text-gray-700">
              Correct answer
              <input
                className="mt-1 p-2 border rounded"
                name="correct_answer"
                value={form.correct_answer}
                onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
                placeholder="Correct answer text"
              />
            </label>
          </div>

          <label className="flex flex-col text-sm text-gray-700 mt-3">
            Question
            <textarea
              className="mt-1 p-2 border rounded"
              name="question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              rows={3}
              placeholder="Type the question here"
            />
          </label>

          <label className="flex flex-col text-sm text-gray-700 mt-3">
            Incorrect answers (comma-separated)
            <input
              className="mt-1 p-2 border rounded"
              name="incorrect_answers"
              value={form.incorrect_answers}
              onChange={(e) => setForm({ ...form, incorrect_answers: e.target.value })}
              placeholder="e.g. red, blue, green"
            />
          </label>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => exportToFile()}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Export as JSON
            </button>
            <button
              type="button"
              onClick={() => castToFarcaster()}
              disabled={!canCast}
              className={`px-4 py-2 rounded text-white ${canCast ? 'bg-fuchsia-600 hover:bg-fuchsia-700' : 'bg-gray-300 cursor-not-allowed'}`}
              title={canCast ? 'Cast this question to Farcaster (opens miniapp and copies message)' : 'Fill question and correct answer to enable casting'}
            >
              Cast to Farcaster
            </button>
            <button
              type="button"
              onClick={() => openOpenTDB()}
              disabled={!canCast}
              className={`px-4 py-2 rounded text-white ${canCast ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-300 cursor-not-allowed'}`}
              title={canCast ? 'Open OpenTDB add question page and copy payload to clipboard' : 'Fill question and correct answer to enable this action'}
            >
              Add directly to OpenTDB
            </button>
            <button
              type="button"
              onClick={() => setForm(DEFAULT_FORM)}
              className="px-3 py-2 border rounded bg-white"
            >
              Reset
            </button>
            <span className="text-sm text-gray-500">Downloads a file named like <em>opentdb_question_*.json</em></span>
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-gray-400">
          Triviacast © 2025. May your answers be quick and your points be plenty. Rocket fuel not included
        </footer>
      </div>

      <HiddenMintButton />
    </div>
  );
}