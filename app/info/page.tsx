"use client";

import React from 'react';

import NeynarAuthButton from '@/components/NeynarAuthButton';

import FarcasterSignup from '@/components/FarcasterSignup';

export default function InfoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[var(--brain-pale)] to-[var(--brain-light)]">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        {/* Mini brain icon and header */}
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
            <img
              src="/brain-small.svg"
              alt="Mini Brain"
              width={56}
              height={56}
              className="drop-shadow-lg mx-auto"
              style={{ marginBottom: '0.5rem' }}
            />
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-dark)] text-center">🎉 Welcome to Triviacast! 🎉</h1>
            <p className="text-sm sm:text-base text-[var(--text-medium)] text-center">Your brain-powered party on Farcaster</p>
              <div className="mt-4">
              <NeynarAuthButton
                label="Sign in with Neynar"
                primary
                variant="farcaster"
              />
              <div className="mt-4 w-full">
                {/* Visible wrapper to make the Farcaster signup area obvious during debugging */}
                <div className="w-full p-3 border-2 border-dashed border-[var(--brain-accent)] rounded-md bg-[var(--brain-pale)]">
                  <div className="text-sm font-semibold text-[var(--brain-dark)] mb-2">Farcaster Signup</div>
                  <div className="text-xs text-[var(--text-medium)] mb-3">Use this to create/register a Farcaster account key. The private key will be downloaded to your device; the app does not store it.</div>
                  <FarcasterSignup />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-4 text-lg text-[var(--text-dark)] text-center bg-[var(--brain-pale)] rounded-xl shadow p-4">
          <strong className="text-[var(--brain-dark)]">Triviacast</strong> is not just a trivia game—it's a brain-powered party on Farcaster! Connect your wallet, flex your knowledge, and climb the leaderboard. Every question is a chance to show off your smarts and earn T Points. 🧠✨
        </div>
        <div className="mb-4 text-lg text-[var(--brain-accent)] font-semibold text-center bg-[var(--brain-light)] rounded-xl shadow p-4">
          🚀 Connect with Farcaster and your Base wallet to unlock the full Triviacast experience!
        </div>
        <div className="mb-6 p-4 bg-gradient-to-r from-[var(--brain-pale)] to-[var(--brain-light)] rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-[var(--brain-dark)]">How to Play</h2>
          <ul className="list-disc pl-6 text-[var(--text-medium)]">
            <li>Connect your Base wallet (no brain wallet required!)</li>
            <li>Answer timed trivia questions—speed and accuracy matter!</li>
            <li>Rack up T Points for every correct answer</li>
            <li>See your Farcaster profile and avatar on the leaderboard</li>
            <li>Claim your points on-chain and show off your trivia skills</li>
            <li>Compete with friends, foes, and Farcaster legends</li>
          </ul>
        </div>
        <div className="mb-6 p-4 bg-[var(--brain-pale)] rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-[var(--brain-secondary)]">Did You Know?</h2>
          <ul className="list-disc pl-6 text-[var(--text-medium)]">
            <li>The fastest answer ever recorded on Triviacast was 0.042 seconds! ⚡</li>
            <li>Our leaderboard is powered by Farcaster usernames—no more boring addresses!</li>
            <li>Every T Point you earn is a badge of honor (and maybe bragging rights).</li>
            <li>We use Neynar to fetch Farcaster profiles in bulk—so you always look your best.</li>
          </ul>
        </div>
        <div className="mb-6 p-4 bg-[var(--brain-light)] rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-[var(--brain-dark)]">Tech & Credits</h2>
          <ul className="list-disc pl-6 text-[var(--text-medium)]">
            <li>Built with Next.js, React, Thirdweb, and Neynar SDK</li>
            <li>Smart contracts live on Base (where trivia meets blockchain)</li>
            <li>Open source: <a href="https://github.com/JesterInvestor/Triviacast" className="text-[var(--brain-accent)] underline" target="_blank" rel="noopener noreferrer">GitHub</a></li>
          </ul>
        </div>
      </div>
      <div className="mb-6 p-4 bg-[var(--brain-pale)] rounded-xl shadow">
        <h2 className="text-xl font-bold mb-2 text-[var(--brain-accent)]">Connect & Cast</h2>
        <p className="text-[var(--text-medium)]">Cast to <a href="https://warpcast.com/jesterinvestor" className="text-[var(--brain-dark)] underline" target="_blank" rel="noopener noreferrer">@jesterinvestor</a> and tell us any errors</p>
        <p className="mt-2 text-[var(--text-medium)]">Got a trivia fact, feature idea, or meme? Cast it our way!</p>
      </div>
      <footer className="mt-8 text-center text-xs text-[var(--text-light)]">Triviacast &copy; 2025. May your answers be quick and your points be plenty! 🚀</footer>
    </div>
  );
}
