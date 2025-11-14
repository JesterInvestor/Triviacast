import type { LocalQuestion, OpenTDBQuestion, QuizQuestion } from '@/types/question';

/**
 * Fetch questions from OpenTDB API
 * @param amount Number of questions to fetch
 * @param difficulty Optional difficulty filter (easy, medium, hard)
 * @param category Optional category ID
 * @returns Array of quiz questions
 */
export async function fetchOpenTDB(
  amount: number = 10,
  difficulty?: string,
  category?: string
): Promise<QuizQuestion[]> {
  const params = new URLSearchParams({
    amount: amount.toString(),
    type: 'multiple',
  });

  if (difficulty) params.append('difficulty', difficulty);
  if (category) params.append('category', category);

  const url = `https://opentdb.com/api.php?${params.toString()}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`OpenTDB API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.response_code !== 0 || !Array.isArray(data.results)) {
    throw new Error('Invalid response from OpenTDB API');
  }

  return data.results.map((q: OpenTDBQuestion) => ({
    question: q.question,
    correct_answer: q.correct_answer,
    incorrect_answers: q.incorrect_answers,
    category: q.category,
    type: q.type,
    difficulty: q.difficulty,
  }));
}

/**
 * Load local Farcaster questions from JSON file
 * @param tags Optional array of tags to filter by
 * @returns Array of local questions
 */
export async function loadLocalFarcasterQuestions(
  tags?: string[]
): Promise<LocalQuestion[]> {
  const response = await fetch('/data/farcaster_questions.json');
  
  if (!response.ok) {
    throw new Error(`Failed to load Farcaster questions: ${response.status}`);
  }

  const questions: LocalQuestion[] = await response.json();

  // Filter by tags if specified
  if (tags && tags.length > 0) {
    return questions.filter(q => 
      q.tags && q.tags.some(tag => tags.includes(tag))
    );
  }

  return questions;
}

/**
 * Convert local questions to quiz question format
 * @param localQuestions Array of local questions
 * @returns Array of quiz questions
 */
export function convertLocalToQuizQuestions(
  localQuestions: LocalQuestion[]
): QuizQuestion[] {
  return localQuestions.map(q => {
    const allOptions = [...q.options];
    const correctAnswer = allOptions[q.answer];
    const incorrectAnswers = allOptions.filter((_, idx) => idx !== q.answer);

    return {
      question: q.question,
      correct_answer: correctAnswer,
      incorrect_answers: incorrectAnswers,
      category: q.tags?.join(', ') || 'Farcaster',
      type: 'multiple',
      difficulty: q.tags?.includes('hard') ? 'hard' : 'medium',
      explanation: q.explanation,
      tags: q.tags,
    };
  });
}

/**
 * Pick random questions from an array without duplicates
 * @param questions Array of questions to pick from
 * @param amount Number of questions to pick
 * @returns Array of randomly selected questions
 */
export function pickRandomQuestions<T>(questions: T[], amount: number): T[] {
  if (amount >= questions.length) {
    // If requesting all or more questions than available, shuffle and return all
    return shuffleArray([...questions]);
  }

  const shuffled = shuffleArray([...questions]);
  return shuffled.slice(0, amount);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param array Array to shuffle
 * @returns Shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get Farcaster questions with optional filtering
 * @param amount Number of questions to return
 * @param tags Optional tags to filter by
 * @returns Array of quiz questions
 */
export async function getFarcasterQuestions(
  amount: number = 10,
  tags?: string[]
): Promise<QuizQuestion[]> {
  const localQuestions = await loadLocalFarcasterQuestions(tags);
  const quizQuestions = convertLocalToQuizQuestions(localQuestions);
  return pickRandomQuestions(quizQuestions, amount);
}
