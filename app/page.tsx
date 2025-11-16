"use client";

import Image from "next/image";
import ClientOnlyWidgets from "@/components/ClientOnlyWidgets";
import Quiz from "@/components/Quiz";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        {/* Top bar (wallet connect + share handled inside ClientOnlyWidgets) */}
        <div className="w-full flex items-center justify-end gap-2 mb-2 sm:mb-4">
          <ClientOnlyWidgets />
        </div>

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
            <Image
              src="/brain-large.svg"
              alt="Triviacast Brain"
              width={60}
              height={60}
              className="drop-shadow-lg sm:w-[60px] sm:h-[60px] mx-auto"
              priority
            />
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center">
              <h1 className="text-5xl sm:text-6xl font-extrabold text-[#2d1b2e] text-center">
                Triviacast
              </h1>
            </div>
          </div>

          {/* Short subtitle */}
          <p className="mt-2 text-sm text-[#5a3d5c] text-center max-w-xl">
            1)Play Quiz 2)If you like it, go to Quests🗺️ 3)Challenge Friend 🎯 4)Cast your own Question ℹ️ Get 100,000 T points and 60 iQ to play $TRIV Jackpot
          </p>
        </div>

        {/* Main quiz */}
        <div className="w-full max-w-4xl">
          <Quiz />
        </div>

        {/* Follow Triviacast button at bottom of main page (sane theme, matches site accents) */}
        <div className="mt-8 w-full flex justify-center">
          <a
            href="https://farcaster.xyz/triviacast"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Triviacast on Farcaster"
            title="Follow Triviacast on Farcaster"
            className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 text-white font-semibold rounded-full shadow-lg hover:scale-[1.02] transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-fuchsia-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path d="M2 21l1-7 7-1 10-10-3 10-10 7-5 1z" fill="rgba(255,255,255,0.14)"></path>
              <path
                d="M16 3l5 5-10 10-5 1 1-5 10-11z"
                stroke="white"
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path d="M7 17l4 4" stroke="white" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="whitespace-nowrap text-sm">Follow Triviacast</span>
          </a>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-400 w-full">
          Triviacast © 2025. May your answers be quick and your points be plenty. Rocket fuel not included
        </footer>
      </div>
    </div>
  );
}