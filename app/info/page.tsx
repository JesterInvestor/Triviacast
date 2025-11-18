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
  const WARPCAST_COMPOSE = "https://warpcast.com/compose";
  const TRIVIACAST_INFO = "https://triviacast.xyz/info";
  const OPEN_TDB_URL = "https://opentdb.com/trivia_add_question.php";

  const canCast = form.question.trim() !== "" && form.correct_answer.trim() !== "";

  const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

  const buildCastMessage = () => {
    const incorrect = (form.incorrect_answers || [])
      .map((s) => (s || "").trim())
      .filter(Boolean);

    const parts: string[] = [];

    parts.push("🎙️ Triviacast question");
    parts.push(""); // blank line for readability
    parts.push(`Q: ${form.question.trim()}`);

    if (form.category && form.category.trim()) {
      parts.push(`Category: ${form.category.trim()}`);
    }

    parts.push(`Difficulty: ${capitalize(form.difficulty)}`);
    parts.push(`✅ Answer: ${form.correct_answer.trim()}`);

    if (incorrect.length) {
      // join incorrect answers with bullet separators to make them easy to scan
      parts.push(`❌ Other options: ${incorrect.join(" • ")}`);
    }

    if (form.reference && form.reference.trim()) {
      parts.push(`🔎 Reference: ${form.reference.trim()}`);
    }

    parts.push(""); // blank line
    parts.push(`Play or add questions: ${TRIVIACAST_INFO}`);
    parts.push(`Miniapp: ${FARCASTER_MINIAPP}`);
    parts.push(""); // blank line
    parts.push("— @jesterinvestor");

    return parts.join("\n");
  };

  const composeToWarpcast = async () => {
    if (!canCast) {
      // simple guard
      // eslint-disable-next-line no-alert
      alert("Please fill at least the question and correct answer before composing a cast.");
      return;
    }

    const message = buildCastMessage();

    try {
      // Prefer Warpcast SDK if injected/available at window.warpcast.compose
      const anyWindow = window as any;
      if (anyWindow.warpcast && typeof anyWindow.warpcast.compose === "function") {
        // If the SDK is present and provides a compose helper, use it.
        await anyWindow.warpcast.compose({ text: message });
        // eslint-disable-next-line no-alert
        alert("Compose opened via Warpcast SDK.");
        return;
      }

      // Fallback: open the Warpcast compose URL with prefilled text
      const url = `${WARPCAST_COMPOSE}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Compose failed", err);
      // eslint-disable-next-line no-alert
      alert("Failed to open compose. You can always copy the text manually from the form.");
    }
  };

  const openOpenTDB = async () => {
    // Open OpenTDB add question page in a new tab. The OpenTDB form must be filled manually.
    window.open(OPEN_TDB_URL, "_blank", "noopener,noreferrer");
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
          <strong>Triviacast</strong> is not just a trivia game. It is a place to test speed, memory and wit while you earn bragging rights and on-chain rewards. Connect your wallet and show your Farc[...]
        </div>

        <div className="mb-4 text-lg text-fuchsia-800 font-semibold text-center">
          🚀 Connect with Farcaster and your Base wallet to unlock the full Triviacast experience
        </div>

        {/* OpenTDB-like Add Question form (moved to top) */}
        <div className="mb-6 p-4 bg-white rounded-xl shadow w-full max-w-2xl border">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2 text-purple-600">Add a Trivia Question (OpenTDB format)</h2>
              <p className="text-sm text-gray-500 mb-1 italic">Thanks to OpenTDB for the open question format.</p>
            </div>
            <div className="ml-4 flex-shrink-0">
              {/* Subtle OpenTDB logo — drop the file into public as /opentdb-logo.png to show */}
              <img src="/opentdb-logo.png" alt="Open Trivia Database" className="w-20 opacity-60" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">Fill the fields to create a multiple-choice question. Share it to Warpcast or add it manually on OpenTDB.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col text-sm text-gray-700">
              Category
              <select
                className="mt-1 p-2 border rounded"
                name="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select a category</option>
                <option>General Knowledge</option>
                <option>Farcaster Knowledge</option>
                <option>Entertainment: Books</option>
                <option>Entertainment: Film</option>
                <option>Entertainment: Music</option>
                <option>Entertainment: Musicals & Theatres</option>
                <option>Entertainment: Television</option>
                <option>Entertainment: Video Games</option>
                <option>Entertainment: Board Games</option>
                <option>Science & Nature</option>
                <option>Science: Computers</option>
                <option>Science: Mathematics</option>
                <option>Mythology</option>
                <option>Sports</option>
                <option>Geography</option>
                <option>History</option>
                <option>Politics</option>
                <option>Art</option>
                <option>Celebrities</option>
                <option>Animals</option>
                <option>Vehicles</option>
                <option>Entertainment: Comics</option>
                <option>Science: Gadgets</option>
                <option>Entertainment: Japanese Anime & Manga</option>
                <option>Entertainment: Cartoon & Animations</option>
              </select>
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
            Incorrect answers (up to 3)
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  className="p-2 border rounded"
                  name={`incorrect_${i}`}
                  value={form.incorrect_answers?.[i] ?? ""}
                  onChange={(e) => {
                    const arr = Array.isArray(form.incorrect_answers) ? [...form.incorrect_answers] : ["", "", ""];
                    arr[i] = e.target.value;
                    setForm({ ...form, incorrect_answers: arr });
                  }}
                  placeholder={`Incorrect ${i + 1}`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Provide up to three incorrect answers for the multiple-choice question.</p>
          </label>

          <label className="flex flex-col text-sm text-gray-700 mt-3">
            Reference (optional)
            <input
              className="mt-1 p-2 border rounded"
              name="reference"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="https://example.com/source"
            />
          </label>

          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded text-sm text-gray-700">
            <strong>Share this question</strong>
            <p className="mt-2">You have a few options to share or submit the question you create:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>
                <strong>Compose on Warpcast</strong>: Click <em>Compose on Warpcast</em> to open the Warpcast compose flow (uses SDK if available, otherwise opens a prefilled compose page).
              </li>
              <li className="mt-1">
                <strong>Add directly to OpenTDB</strong>: Click <em>Add directly to OpenTDB</em> to open the OpenTDB submission page. Fill the OpenTDB form manually — no autofill is provided.
              </li>
            </ul>
            <p className="mt-3 text-sm text-gray-600">Casted questions will be reviewed and, when accepted, added to Triviacast on a weekly cadence.</p>
            <p className="mt-2 text-sm text-gray-600">Readers: you can add your own questions at <a href="https://triviacast.xyz/info" className="underline">triviacast.xyz/info</a>.</p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => composeToWarpcast()}
              disabled={!canCast}
              className={`px-4 py-2 rounded text-white ${canCast ? "bg-fuchsia-600 hover:bg-fuchsia-700" : "bg-gray-300 cursor-not-allowed"}`}
              title={canCast ? "Open Warpcast compose (uses SDK if present)" : "Fill question and correct answer to enable composing"}
            >
              Compose on Warpcast
            </button>

            <button
              type="button"
              onClick={() => openOpenTDB()}
              className="px-4 py-2 rounded text-white bg-yellow-600 hover:bg-yellow-700"
              title="Open OpenTDB add question page"
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
          </div>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-pink-100 to-blue-100 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-purple-600">How to Play</h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>Connect your Base wallet — no brain wallet required</li>
            <li>Answer timed trivia drawn from open source sets — speed and accuracy score you higher</li>
            <li>Earn T Points for correct answers and win bonus points for streaks</li>
            <li>See your Farcaster profile and avatar on the leaderboard in real time</li>
            <li>Claim your rewards on chain and show off your trivia skill</li>
            <li>Challenge friends or climb solo to prove you are the fastest thinker in the room</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-white rounded-xl shadow w-full max-w-2xl border">
          <h2 className="text-xl font-bold mb-2 text-purple-600">How to Challenge a Friend</h2>
          <p className="text-gray-700">Want to dare a friend? Here is the quick flow:</p>
          <ol className="list-decimal pl-6 text-gray-700 mt-2">
            <li>Open the Challenge page and search for your friend by Farcaster handle</li>
            <li>Select their profile and click Play Quiz</li>
            <li>After you finish the quiz you will see a preview message that mentions them — edit it if you want</li>
            <li>Post the cast from your account using Base or Farcaster or copy the message to share manually</li>
            <li>Your friend will be mentioned in the cast and the challenge begins — may the best brain win</li>
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
          <p className="text-gray-700">Quests are live and growing. Complete daily challenges and event quests to earn bonus T Points and unique status. Quests are collections of questions that reward[...]
          <ul className="list-disc pl-6 text-gray-700 mt-2">
            <li>Daily Quest — complete a short set of questions every day to earn bonus T Points</li>
            <li>Weekly Quest — finish a longer challenge for rare rewards and leaderboard boosts</li>
            <li>Event Quest — limited-time themed quizzes with special prizes</li>
            <li>Jackpot — coming soon for top players and quest masters. Stay tuned for the official launch on Warpcast and in-app</li>
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
            <li>T Points unlock quests, boosts and eligibility for token drops and jackpot events</li>
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
          <p className="mt-2 text-gray-700">Got a trivia fact idea, feature request, or a perfect meme? Cast it our way and we may feature it in a quest.</p>

          {/* Fancy Follow button */}
          <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <a
              href="https://farcaster.xyz/triviacast"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Triviacast on Farcaster"
              title="Follow Triviacast on Farcaster"
              className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 text-white font-semibold rounded-full shadow-2xl hover:scale-[1.03]"
            >
              {/* simple rocket / follow icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M2 21l1-7 7-1 10-10-3 10-10 7-5 1z" fill="rgba(255,255,255,0.18)"></path>
                <path d="M16 3l5 5-10 10-5 1 1-5 10-11z" stroke="white" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M7 17l4 4" stroke="white" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <span className="whitespace-nowrap">Follow Triviacast</span>
            </a>

            <a
              href="https://warpcast.com/jesterinvestor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-full bg-white text-fuchsia-600 shadow hover:shadow-md transition"
              title="Visit @jesterinvestor on Warpcast"
            >
              View @jesterinvestor
            </a>
          </div>
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

        <footer className="mt-8 text-center text-xs text-gray-400">
          Triviacast © 2025. May your answers be quick and your points be plenty. Rocket fuel not included
        </footer>
      </div>

      <HiddenMintButton />
    </div>
  );
}
