import { Question, ScoringResult } from '@/types/quiz';

/**
 * Base points awarded for each correct answer
 */
const BASE_POINTS_PER_CORRECT = 1000;

/**
 * Bonus points for streak milestones
 */
const STREAK_BONUSES = {
  THREE_IN_A_ROW: 500,
  FIVE_IN_A_ROW: 1000,
  PERFECT_TEN: 2000,
} as const;

/**
 * Calculate T points earned for answering a question
 * @param consecutiveCorrect - Current count of consecutive correct answers (after this answer)
 * @param isCorrect - Whether the current answer is correct
 * @returns Number of points earned
 */
export function calculateTPoints(
  consecutiveCorrect: number,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0;

  let points = BASE_POINTS_PER_CORRECT;

  // Award streak bonuses at specific milestones
  if (consecutiveCorrect === 3) {
    points += STREAK_BONUSES.THREE_IN_A_ROW;
  } else if (consecutiveCorrect === 5) {
    points += STREAK_BONUSES.FIVE_IN_A_ROW;
  } else if (consecutiveCorrect === 10) {
    points += STREAK_BONUSES.PERFECT_TEN;
  }

  return points;
}

/**
 * Process a user's answer to a question and calculate scoring
 * @param question - The question being answered
 * @param userAnswer - The user's answer
 * @param currentConsecutiveCorrect - Current streak of consecutive correct answers
 * @returns Scoring result with points, correctness, and updated streak
 */
export function processAnswer(
  question: Question,
  userAnswer: string,
  currentConsecutiveCorrect: number
): ScoringResult {
  const isCorrect = userAnswer === question.correct_answer;
  const newConsecutive = isCorrect ? currentConsecutiveCorrect + 1 : 0;
  const points = calculateTPoints(newConsecutive, isCorrect);

  return {
    points,
    isCorrect,
    consecutiveCorrect: newConsecutive,
  };
}

/**
 * Calculate total score for a completed quiz
 * @param questions - Array of questions
 * @param answers - Array of user answers
 * @returns Object containing score and total T points earned
 */
export function calculateQuizScore(
  questions: Question[],
  answers: (string | null)[]
): { score: number; tPoints: number } {
  let score = 0;
  let tPoints = 0;
  let consecutiveCorrect = 0;

  questions.forEach((question, index) => {
    const userAnswer = answers[index];
    if (userAnswer) {
      const result = processAnswer(question, userAnswer, consecutiveCorrect);
      if (result.isCorrect) {
        score++;
      }
      tPoints += result.points;
      consecutiveCorrect = result.consecutiveCorrect;
    }
  });

  return { score, tPoints };
}
