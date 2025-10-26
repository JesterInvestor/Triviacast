"use client";

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        {/* Mini brain icon and header */}
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
            <img
              src="/brain-small.svg"
              alt="Mini Brain"
              width={48}
              height={48}
              className="drop-shadow-lg sm:w-[56px] sm:h-[56px] mx-auto"
              style={{ marginBottom: '0.5rem' }}
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2d1b2e] text-center">🎉 Welcome to Triviacast! 🎉</h1>
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
            <li>Built with next.js, react, thirdweb, and neynar SDK</li>
            <li>Smart contracts live on Base (where trivia meets blockchain)</li>
            <li>Open source: <a href="https://github.com/JesterInvestor/Triviacast" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">GitHub</a></li>
          </ul>
        </div>
      </div>
      <div className="mb-6 p-4 bg-fuchsia-50 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-2 text-fuchsia-700">Connect & Cast</h2>
  <p className="text-gray-700">Cast to <a href="https://warpcast.com/jesterinvestor" className="text-fuchsia-600 underline" target="_blank" rel="noopener noreferrer">@jesterinvestor</a> with errors and feedback</p>
  <p className="mt-2 text-gray-700">Got a trivia fact, feature idea, or meme? Cast it our way!</p>
      </div>
      <footer className="mt-8 text-center text-xs text-gray-400">Triviacast &copy; 2025. May your answers be quick and your points be plenty! 🚀</footer>
    </div>
  );
}
