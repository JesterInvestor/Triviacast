import type { Question } from '@/types/quiz';
import farcasterQuestions from '@/data/farcaster_questions.json';

/**
 * Fetch questions from OpenTDB API
 */
export async function fetchOpenTDB(amount: number = 10, difficulty?: string, category?: string): Promise<Question[]> {
  const OPEN_TDB_CATEGORY_IDS: Record<string, number> = {
    'General Knowledge': 9,
    'Entertainment: Books': 10,
    'Entertainment: Film': 11,
    'Entertainment: Music': 12,
    'Entertainment: Musicals & Theatres': 13,
    'Entertainment: Television': 14,
    'Entertainment: Video Games': 15,
    'Entertainment: Board Games': 16,
    'Science & Nature': 17,
    'Science: Computers': 18,
    'Science: Mathematics': 19,
    'Mythology': 20,
    'Sports': 21,
    'Geography': 22,
    'History': 23,
    'Politics': 24,
    'Art': 25,
    'Celebrities': 26,
    'Animals': 27,
    'Vehicles': 28,
    'Entertainment: Comics': 29,
    'Science: Gadgets': 30,
    'Entertainment: Japanese Anime & Manga': 31,
    'Entertainment: Cartoon & Animations': 32,
  };

  const buildUrl = (count: number) => {
    let url = `https://opentdb.com/api.php?amount=${count}&type=multiple`;
    if (difficulty) {
      url += `&difficulty=${difficulty}`;
    }
    if (category) {
      // If category is a numeric id string, use it directly; otherwise map the human-readable name
      const asNumber = Number(category);
      if (!Number.isNaN(asNumber) && asNumber > 0) {
        url += `&category=${asNumber}`;
      } else if (OPEN_TDB_CATEGORY_IDS[category]) {
        url += `&category=${OPEN_TDB_CATEGORY_IDS[category]}`;
      }
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
    // Log and rethrow with generic message
    const { default: logger, error: logError } = await import('./logger');
    logError(error, { context: 'fetchOpenTDB' });
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
  difficulty?: string,
  category?: string
): Promise<Question[]> {
  if (source === 'farcaster') {
    let allQuestions = loadLocalFarcasterQuestions();
    if (category) {
      allQuestions = allQuestions.filter((q) => (q.category || '').toLowerCase() === category.toLowerCase());
    }
    return pickRandomQuestions(allQuestions, amount, difficulty);
  } else {
    return fetchOpenTDB(amount, difficulty, category);
  }
}
