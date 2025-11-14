import type { Question } from '@/types/quiz';
import farcasterQuestions from '@/data/farcaster_questions.json';

/**
 * Fetch questions from OpenTDB API
 */
export async function fetchOpenTDB(amount: number = 10, difficulty?: string): Promise<Question[]> {
  const buildUrl = (count: number) => {
    let url = `https://opentdb.com/api.php?amount=${count}&type=multiple`;
    if (difficulty) {
      url += `&difficulty=${difficulty}`;
    }
    return url;
  };

  try {
    const collected: Question[] = [];
    const seen = new Set<string>();
    let remaining = amount;
    let attempts = 0;

    while (collected.length < amount && attempts < 5 && remaining > 0) {
      attempts += 1;
      const resp = await fetch(buildUrl(remaining));
      const data = await resp.json();

      if (!data || typeof data !== 'object' || data.response_code !== 0 || !Array.isArray(data.results)) {
        break;
      }

      for (const q of data.results) {
        const key = String(q.question).trim();
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(q);
          if (collected.length >= amount) break;
        }
      }

      remaining = amount - collected.length;
      if (data.results.length === 0) break;
    }

    return collected.sort(() => Math.random() - 0.5).slice(0, amount);
  } catch (error) {
    console.error('Error fetching from OpenTDB:', error);
    throw new Error('Failed to fetch questions from OpenTDB');
  }
}

/**
 * Load Farcaster questions from local JSON file
 */
export function loadLocalFarcasterQuestions(): Question[] {
  return farcasterQuestions as Question[];
}

/**
 * Pick random questions from a pool, optionally filtering by difficulty
 */
export function pickRandomQuestions(
  pool: Question[],
  amount: number = 10,
  difficulty?: string
): Question[] {
  let filtered = pool;
  
  // Filter by difficulty if specified
  if (difficulty) {
    const difficulties = difficulty.split(',').map(d => d.trim().toLowerCase());
    filtered = pool.filter(q => difficulties.includes(q.difficulty.toLowerCase()));
  }

  // If not enough questions after filtering, use all available
  if (filtered.length <= amount) {
    return [...filtered].sort(() => Math.random() - 0.5);
  }

  // Shuffle and pick random subset
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, amount);
}

/**
 * Get questions based on source (opentdb or farcaster)
 */
export async function getQuestions(
  source: 'opentdb' | 'farcaster',
  amount: number = 10,
  difficulty?: string
): Promise<Question[]> {
  if (source === 'farcaster') {
    const allQuestions = loadLocalFarcasterQuestions();
    return pickRandomQuestions(allQuestions, amount, difficulty);
  } else {
    return fetchOpenTDB(amount, difficulty);
  }
}
