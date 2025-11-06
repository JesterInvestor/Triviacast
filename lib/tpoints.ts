import { LeaderboardEntry } from '@/types/quiz';
import { 
  getPointsFromChain, 
  getLeaderboardFromChain, 
  isContractConfigured 
} from './contract';
import { calculateTPoints as calculatePoints } from './quizScoring';

/**
 * @deprecated Use calculateTPoints from '@/lib/quizScoring' instead
 * This function is kept for backward compatibility
 */
export function calculateTPoints(
  consecutiveCorrect: number,
  isCorrect: boolean
): number {
  return calculatePoints(consecutiveCorrect, isCorrect);
}

/**
 * Get leaderboard from blockchain
 * @returns Array of leaderboard entries sorted by T points (descending)
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isContractConfigured()) {
    console.warn('Contract not configured - cannot fetch leaderboard');
    return [];
  }

  try {
    // Get total number of wallets to fetch all entries
    const { getTotalWalletsFromChain } = await import('./contract');
    const totalWallets = await getTotalWalletsFromChain();
    console.info('[Triviacast] getLeaderboard totalWallets', totalWallets);
    
    // Fetch all wallets with points (use a large limit or the total count)
    const limit = Math.max(totalWallets, 1000); // At least 1000 to be safe
    console.info('[Triviacast] getLeaderboard using limit', limit);
    const chainLeaderboard = await getLeaderboardFromChain(limit);
    
    return chainLeaderboard;
  } catch (error) {
    console.error('Failed to fetch leaderboard from chain:', error);
    return [];
  }
}

/**
 * Get wallet's total T points from blockchain
 * @param walletAddress The wallet address to query
 * @returns Total T points for the wallet
 */
export async function getWalletTotalPoints(walletAddress: string): Promise<number> {
  if (!isContractConfigured()) {
    console.warn('Contract not configured - cannot fetch points');
    return 0;
  }

  try {
    const chainPoints = await getPointsFromChain(walletAddress);
    return chainPoints;
  } catch (error) {
    console.error('Failed to fetch points from chain:', error);
    return 0;
  }
}

/**
 * Calculate new total points (does not store - blockchain write happens in QuizResults)
 * This function is kept for compatibility but doesn't write to localStorage anymore
 * @param walletAddress The wallet address
 * @param points Points to add
 * @returns New total (current + added points)
 */
export async function addWalletTPoints(walletAddress: string, points: number): Promise<number> {
  const currentTotal = await getWalletTotalPoints(walletAddress);
  const newTotal = currentTotal + points;
  return newTotal;
}
