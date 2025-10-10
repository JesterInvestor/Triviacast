import Leaderboard from '@/components/Leaderboard';
import WalletConnect from '@/components/WalletConnect';

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <WalletConnect />
        </div>
        <Leaderboard />
      </div>
    </div>
  );
}
