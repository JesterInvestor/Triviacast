import { QuizResult } from '@/types/quiz';
import { addPointsOnChain, isContractConfigured } from './contract';
import type { Account } from 'thirdweb/wallets';
import { signMessage } from 'thirdweb/utils';

/**
 * Result of storing a quiz result
 */
export interface StorageResult {
  success: boolean;
  savedToBlockchain: boolean;
  error?: string;
}

/**
 * Store quiz results to blockchain and/or local storage
 * @param result - The quiz result to store
 * @param account - The user's connected account for blockchain transactions
 * @returns Storage result indicating success and where data was saved
 */
export async function storeQuizResult(
  result: QuizResult,
  account?: Account
): Promise<StorageResult> {
  const storageResult: StorageResult = {
    success: false,
    savedToBlockchain: false,
  };

  // Require signature before awarding points
  if (!account || !account.address) {
    storageResult.error = 'No connected account available';
    return storageResult;
  }

  if (result.tPoints === 0) {
    // No points to save
    storageResult.success = true;
    return storageResult;
  }

  try {
    // Request user signature for verification
    // Include timestamp and quiz details to prevent replay attacks
    const message = `I am claiming ${result.tPoints} T Points for completing the Triviacast quiz ${result.quizId} on ${result.completedAt.toISOString()}\nWallet: ${result.walletAddress}\nScore: ${result.score}/${result.totalQuestions}`;
    console.debug('[Triviacast] Requesting signature:', {
      address: account.address,
      message,
    });

    let signature;
    try {
      signature = await signMessage({ message, account });
      console.debug('[Triviacast] Signature obtained:', signature);
    } catch (err) {
      storageResult.error = 'Signature was not provided. T Points cannot be awarded.';
      return storageResult;
    }

    // If contract is configured, save to blockchain
    if (isContractConfigured()) {
      try {
        console.debug('[Triviacast] Saving to blockchain:', {
          address: account.address,
          tPoints: result.tPoints,
        });
        await addPointsOnChain(account, account.address, result.tPoints);
        storageResult.savedToBlockchain = true;
        console.log('[Triviacast] Points saved to blockchain successfully');
      } catch (error) {
        console.error('[Triviacast] Failed to save points to blockchain:', error);
        storageResult.error = 'Failed to save to blockchain. Open miniapp with Farcaster to get T points and $TRIV';
      }
    } else {
      console.warn('[Triviacast] Contract not configured, blockchain storage skipped');
      storageResult.error = 'Blockchain not configured';
    }

    storageResult.success = true;
  } catch (error) {
    console.error('[Triviacast] Failed to store quiz result:', error);
    storageResult.error = 'Failed to save points. Please try again.';
  }

  return storageResult;
}

/**
 * Get quiz result summary for sharing or display
 * @param result - The quiz result
 * @returns Formatted summary object
 */
export function getQuizResultSummary(result: QuizResult): {
  score: number;
  totalQuestions: number;
  percentage: number;
  tPoints: number;
} {
  const percentage = Math.round((result.score / result.totalQuestions) * 100);
  return {
    score: result.score,
    totalQuestions: result.totalQuestions,
    percentage,
    tPoints: result.tPoints,
  };
}
