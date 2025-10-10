import Quiz from '@/components/Quiz';
import WalletConnect from '@/components/WalletConnect';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 flex justify-between items-center">
          <WalletConnect />
          <Link
            href="/leaderboard"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            🏆 Leaderboard
          </Link>
        </div>
        <Quiz />
      </div>
    </div>
  );
}
