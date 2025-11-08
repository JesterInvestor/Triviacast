"use client";

import Image from 'next/image';
import { useSound } from '@/components/SoundContext';

export default function InfoPage() {
  const sound = useSound();
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
              style={{ marginBottom: '0.5rem' }}
            />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2d1b2e] text-center"> Welcome to Triviacast! </h1>
            <button
              onPointerUp={() => sound.toggle()}
              aria-pressed={sound.disabled}
              className="mt-2 sm:mt-3 bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-4 rounded-lg shadow text-sm"
            >
              {sound.disabled ? 'Unmute All Sound' : 'Mute All Sound'}
            </button>
            <p className="text-xs sm:text-sm text-[#5a3d5c] text-center">Your brain-powered party on Farcaster</p>
          </div>
        </div>
        <div className="mb-4 text-lg text-gray-800 text-center">
          <strong>Triviacast</strong> is not just a trivia game! It's a brain-powered party on Farcaster! Connect your wallet, flex your knowledge, and climb into the leaderboard. Every question is a chance to show off your smarty pants and earn T Points. 🧠✨
        </div>
        <div className="mb-4 text-lg text-fuchsia-800 font-semibold text-center">
          🚀 Connect with Farcaster and your Base wallet to unlock the full Triviacast experience!
        </div>
        <div className="mb-6 p-4 bg-gradient-to-r from-pink-100 to-blue-100 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-purple-600">How to Play</h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>Connect your Base wallet (no brain wallet required!)</li>
            <li>Answer timed trivia open source questions. Speed and accuracy matter!</li>
            <li>Rack up T Points for every correct answer</li>
            <li>See your Farcaster profile and avatar on the leaderboard</li>
            <li>Claim your points on-chain and show off your trivia skills</li>
            <li>Compete with friends, foes, and Farcaster legends (Multiplayer coming......)</li>
          </ul>
        </div>
        <div className="mb-6 p-4 bg-white rounded-xl shadow w-full max-w-2xl border">
          <h2 className="text-xl font-bold mb-2 text-purple-600">How to Challenge a Friend</h2>
          <p className="text-gray-700">Want to dare a friend? Here's the quick flow:</p>
          <ol className="list-decimal pl-6 text-gray-700 mt-2">
            <li>Open <strong>Challenge</strong> (Challenge page) and search for your friend's Farcaster handle.</li>
            <li>Click <strong>Play Quiz</strong> after selecting their profile.</li>
            <li>After you finish the quiz you'll see a preview message that mentions them — edit it if you want.</li>
            <li>Post from your account via <strong>Base</strong> or <strong>Farcaster</strong>, or copy the message to share it manually.</li>
            <li>Your friend will be mentioned in the cast — and the challenge is on. May the best brain win!</li>
          </ol>
        </div>
        <div className="mb-6 p-4 bg-yellow-50 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-yellow-700">Did You Know?</h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>The fastest answer ever recorded on Triviacast was 0.042 seconds!(render speed) ⚡</li>
            <li>Our leaderboard is powered by neynar; no more boring addresses!</li>
            <li>Every T Point you earn is a badge of honor (and maybe bragging rights).</li>
            <li>We use neynar to fetch Farcaster profiles in bulk—so you always look your best.</li>
          </ul>
        </div>
        <div className="mb-6 p-4 bg-blue-50 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-blue-700">Tech & Credits</h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>Built with Next.js, React, wagmi + viem, and Neynar SDK</li>
            <li>Smart contracts live on Base (where trivia meets blockchain)</li>
            <li>Open source: <a href="https://github.com/JesterInvestor/Triviacast" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">GitHub</a></li>
          </ul>
        </div>
        <div className="mb-6 p-4 bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-purple-700 flex items-center gap-2">
            <Image src="/brain-small.svg" alt="Brain" width={24} height={24} />
            About T Points
          </h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>Earn 1000 T points for each correct answer</li>
            <li>Get 3 in a row for +500 bonus points</li>
            <li>Get 5 in a row for +1000 bonus points</li>
            <li>Perfect 10 in a row for +2000 bonus points!</li>
            <li>T points will be used in this app</li>
          </ul>
        </div>
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-orange-700 flex items-center gap-2">
            <Image src="/brain-small.svg" alt="Brain" width={24} height={24} />
            About $TRIV
          </h2>
          <ul className="list-disc pl-6 text-gray-700">
            <li>$TRIV is the native token CA 0xa889A10126024F39A0ccae31D09C18095CB461B8</li>
            <li>CLAIM $TRIV when prompted</li>
            <li className="font-bold text-orange-600">Top T point holders can claim HUGE Airdrops of $TRIV tokens daily!</li>
            <li className="text-sm italic">BUY $TRIV with swap</li>
            <li className="text-sm italic">Jackpot coming soon............ Users with 100,000 T points. So triviacast now!!!</li>
          </ul>
        </div>
        <div className="mb-6 p-4 bg-fuchsia-50 rounded-xl shadow w-full max-w-2xl">
          <h2 className="text-xl font-bold mb-2 text-fuchsia-700">Connect & Cast</h2>
          <p className="text-gray-700">Cast to <a href="https://warpcast.com/jesterinvestor" className="text-fuchsia-600 underline" target="_blank" rel="noopener noreferrer">@jesterinvestor</a> with errors and feedback</p>
          <p className="mt-2 text-gray-700">Got a trivia fact, feature idea, or meme? Cast it our way!</p>
        </div>
        <footer className="mt-8 text-center text-xs text-gray-400">Triviacast &copy; 2025. May your answers be quick and your points be plenty! 🚀</footer>
      </div>
    </div>
  );
}
