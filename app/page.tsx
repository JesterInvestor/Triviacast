import Quiz from '@/components/Quiz';
import WalletConnect from '@/components/WalletConnect';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image 
              src="/brain-large.svg" 
              alt="Triviacast Brain" 
              width={60} 
              height={60}
              className="drop-shadow-lg"
            />
            <div>
              <h1 className="text-3xl font-bold text-[#2d1b2e]">Triviacast</h1>
              <p className="text-sm text-[#5a3d5c]">Test Your Brain Power</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <WalletConnect />
            <Link
              href="/leaderboard"
              className="bg-[#F4A6B7] hover:bg-[#E8949C] text-white font-bold py-2 px-6 rounded-lg transition shadow-lg flex items-center gap-2"
            >
              🏆 Leaderboard
            </Link>
          </div>
        </div>
        <Quiz />
      </div>
    </div>
  );
}
