import { LeaderboardEntry } from '@/types/quiz';
import { 
  getPointsFromChain, 
  getLeaderboardFromChain, 
  isContractConfigured 
} from './contract';

const WALLET_POINTS_KEY_PREFIX = 'triviacast_wallet_points_';
const WALLET_LEADERBOARD_KEY = 'triviacast_wallet_leaderboard';

export function calculateTPoints(
  consecutiveCorrect: number,
  isCorrect: boolean,
  previousConsecutive: number
): number {
  if (!isCorrect) return 0;

  let points = 1000; // Base points for correct answer

  // Check for streak bonuses
  if (consecutiveCorrect === 3) {
    points += 500; // 3 in a row bonus
  } else if (consecutiveCorrect === 5) {
    points += 1000; // 5 in a row bonus
  } else if (consecutiveCorrect === 10) {
    points += 2000; // Perfect 10 bonus
  }

  return points;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Try to get from blockchain first if contract is configured
  if (isContractConfigured()) {
    try {
      // Get total number of wallets to fetch all entries
      const { getTotalWalletsFromChain } = await import('./contract');
      const totalWallets = await getTotalWalletsFromChain();
      
      // Fetch all wallets with points (use a large limit or the total count)
      const limit = Math.max(totalWallets, 1000); // At least 1000 to be safe
      const chainLeaderboard = await getLeaderboardFromChain(limit);
      
      if (chainLeaderboard.length > 0) {
        return chainLeaderboard;
      }
    } catch (error) {
      console.warn('Failed to fetch leaderboard from chain, falling back to localStorage:', error);
    }
  }

  // Fallback to localStorage
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(WALLET_LEADERBOARD_KEY);
  if (!stored) return [];
  
  try {
    const leaderboard = JSON.parse(stored);
    // Return all entries, not just top 100
    return leaderboard;
  } catch {
    return [];
  }
}

function updateLeaderboard(walletAddress: string, totalPoints: number): void {
  if (typeof window === 'undefined') return;
  
  // Get leaderboard from localStorage only for updating
  const stored = localStorage.getItem(WALLET_LEADERBOARD_KEY);
  let leaderboard: LeaderboardEntry[] = [];
  
  if (stored) {
    try {
      leaderboard = JSON.parse(stored);
    } catch {
      leaderboard = [];
    }
  }
  
  // Check if wallet already exists
  const existingIndex = leaderboard.findIndex(
    entry => entry.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    // Update existing entry
    leaderboard[existingIndex].tPoints = totalPoints;
  } else {
    // Add new entry
    leaderboard.push({
      walletAddress,
      tPoints: totalPoints,
    });
  }
  
  // Sort by points descending
  leaderboard.sort((a, b) => b.tPoints - a.tPoints);
  
  // Store all entries (no limit)
  localStorage.setItem(WALLET_LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

// --- Wallet-based point storage ---

export async function getWalletTotalPoints(walletAddress: string): Promise<number> {
  // Try to get from blockchain first if contract is configured
  if (isContractConfigured()) {
    try {
      const chainPoints = await getPointsFromChain(walletAddress);
      if (chainPoints > 0) {
        return chainPoints;
      }
    } catch (error) {
      console.warn('Failed to fetch points from chain, falling back to localStorage:', error);
    }
  }

  // Fallback to localStorage
  if (typeof window === 'undefined') return 0;
  
  const key = WALLET_POINTS_KEY_PREFIX + walletAddress.toLowerCase();
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

export async function addWalletTPoints(walletAddress: string, points: number): Promise<number> {
  if (typeof window === 'undefined') return 0;
  
  // For now, we only update localStorage
  // The actual blockchain transaction will be done in QuizResults component
  // where we have access to the user's account
  const key = WALLET_POINTS_KEY_PREFIX + walletAddress.toLowerCase();
  const currentTotal = await getWalletTotalPoints(walletAddress);
  const newTotal = currentTotal + points;
  localStorage.setItem(key, newTotal.toString());
  
  // Update leaderboard with new total
  updateLeaderboard(walletAddress, newTotal);
  
  return newTotal;
}
