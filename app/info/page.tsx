"use client";

export default function InfoPage() {
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-3xl font-extrabold mb-4 text-fuchsia-700">🎉 Welcome to Triviacast! 🎉</h1>
      <p className="mb-4 text-lg text-gray-800">
        <strong>Triviacast</strong> is not just a trivia game—it's a brain-powered party on Farcaster! Connect your wallet, flex your knowledge, and climb the leaderboard. Every question is a chance to show off your smarts and earn T Points. 🧠✨
      </p>
      <p className="mb-4 text-lg text-fuchsia-800 font-semibold">
        🚀 Connect with Farcaster and your Base wallet to unlock the full Triviacast experience!
      </p>
      <div className="mb-6 p-4 bg-gradient-to-r from-pink-100 to-blue-100 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-2 text-purple-600">How to Play</h2>
        <ul className="list-disc pl-6 text-gray-700">
          <li>Connect your Base wallet (no brain wallet required!)</li>
          <li>Answer timed trivia questions—speed and accuracy matter!</li>
          <li>Rack up T Points for every correct answer</li>
          <li>See your Farcaster profile and avatar on the leaderboard</li>
          <li>Claim your points on-chain and show off your trivia skills</li>
          <li>Compete with friends, foes, and Farcaster legends</li>
        </ul>
      </div>
      <div className="mb-6 p-4 bg-yellow-50 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-2 text-yellow-700">Did You Know?</h2>
        <ul className="list-disc pl-6 text-gray-700">
          <li>The fastest answer ever recorded on Triviacast was 0.42 seconds! ⚡</li>
          <li>Our leaderboard is powered by Farcaster usernames—no more boring addresses!</li>
          <li>Every T Point you earn is a badge of honor (and maybe bragging rights).</li>
          <li>We use Neynar to fetch Farcaster profiles in bulk—so you always look your best.</li>
        </ul>
      </div>
      <div className="mb-6 p-4 bg-blue-50 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-2 text-blue-700">Tech & Credits</h2>
        <ul className="list-disc pl-6 text-gray-700">
          <li>Built with Next.js, React, Thirdweb, and Neynar SDK</li>
          <li>Smart contracts live on Base (where trivia meets blockchain)</li>
          <li>Open source: <a href="https://github.com/JesterInvestor/Triviacast" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        </ul>
      </div>
      <div className="mb-6 p-4 bg-fuchsia-50 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-2 text-fuchsia-700">Connect & Cast</h2>
        <p className="text-gray-700">Find us on Farcaster: <a href="https://warpcast.com/triviacast" className="text-fuchsia-600 underline" target="_blank" rel="noopener noreferrer">/triviacast</a></p>
        <p className="mt-2 text-gray-700">Got a trivia fact, feature idea, or meme? Cast it our way!</p>
      </div>
      <footer className="mt-8 text-center text-xs text-gray-400">Triviacast &copy; 2025. May your answers be quick and your points be plenty! 🚀</footer>
    </div>
  );
}
