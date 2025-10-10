import { LeaderboardEntry } from '@/types/quiz';

const LEADERBOARD_KEY = 'triviacast_leaderboard';
const USER_TOTAL_POINTS_KEY = 'triviacast_user_total_points';
const WALLET_POINTS_KEY_PREFIX = 'triviacast_wallet_points_';

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

export function getUserTotalPoints(): number {
  if (typeof window === 'undefined') return 0;
  
  const stored = localStorage.getItem(USER_TOTAL_POINTS_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

export function addUserTPoints(points: number): number {
  if (typeof window === 'undefined') return 0;
  
  const currentTotal = getUserTotalPoints();
  const newTotal = currentTotal + points;
  localStorage.setItem(USER_TOTAL_POINTS_KEY, newTotal.toString());
  return newTotal;
}

export function getLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addToLeaderboard(userName: string, tPoints: number): void {
  if (typeof window === 'undefined') return;
  
  const leaderboard = getLeaderboard();
  
  // Check if user already exists
  const existingIndex = leaderboard.findIndex(entry => entry.userName === userName);
  
  if (existingIndex >= 0) {
    // Update existing entry
    leaderboard[existingIndex].tPoints += tPoints;
    leaderboard[existingIndex].timestamp = Date.now();
  } else {
    // Add new entry
    leaderboard.push({
      userName,
      tPoints,
      timestamp: Date.now(),
    });
  }
  
  // Sort by points descending
  leaderboard.sort((a, b) => b.tPoints - a.tPoints);
  
  // Keep top 100
  const trimmed = leaderboard.slice(0, 100);
  
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
}

// --- Wallet-based point storage ---

export function getWalletTotalPoints(walletAddress: string): number {
  if (typeof window === 'undefined') return 0;
  
  const key = WALLET_POINTS_KEY_PREFIX + walletAddress.toLowerCase();
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

export function addWalletTPoints(walletAddress: string, points: number): number {
  if (typeof window === 'undefined') return 0;
  
  const key = WALLET_POINTS_KEY_PREFIX + walletAddress.toLowerCase();
  const currentTotal = getWalletTotalPoints(walletAddress);
  const newTotal = currentTotal + points;
  localStorage.setItem(key, newTotal.toString());
  return newTotal;
}
