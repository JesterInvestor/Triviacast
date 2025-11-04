import { NextResponse } from 'next/server';

// Small fallback sample set used when the OpenTDB API fails
const SAMPLE_QUESTIONS = {
  response_code: 0,
  results: [
    {
      category: "General Knowledge",
      type: "multiple",
      difficulty: "easy",
      question: "What is the capital of France?",
      correct_answer: "Paris",
      incorrect_answers: ["London", "Berlin", "Madrid"]
    },
    {
      category: "Science: Computers",
      type: "multiple",
      difficulty: "medium",
      question: "What does CPU stand for?",
      correct_answer: "Central Processing Unit",
      incorrect_answers: [
        "Central Process Unit",
        "Computer Personal Unit",
        "Central Processor Unit"
      ]
    },
    {
      category: "History",
      type: "multiple",
      difficulty: "hard",
      question: "In what year did World War II end?",
      correct_answer: "1945",
      incorrect_answers: ["1944", "1946", "1943"]
    }
  ]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedAmount = Number(searchParams.get('amount') || '10');
  // clamp amount to a sensible range (1..50)
  const amount = Math.max(1, Math.min(50, requestedAmount));
  const category = searchParams.get('category') || '';

  // Build an OpenTDB url WITHOUT specifying difficulty so we get mixed difficulties
  const buildUrl = (count: number) =>
    `https://opentdb.com/api.php?amount=${count}${category ? `&category=${category}` : ''}&type=multiple`;

  try {
    // We'll collect unique questions (dedupe by question text)
    const collected: any[] = [];
    const seen = new Set<string>();
    let remaining = amount;
    let attempts = 0;

    // Attempt multiple fetches to fill the requested amount (in case API returns duplicates)
    // But guard attempts to avoid endless loops or too many requests.
    while (collected.length < amount && attempts < 5 && remaining > 0) {
      attempts += 1;
      // Request up to `remaining` items. The API will return that many if available.
      const resp = await fetch(buildUrl(remaining));
      const data = await resp.json();

      if (!data || typeof data !== 'object' || data.response_code !== 0 || !Array.isArray(data.results)) {
        // Stop trying if API returned an error code or malformed data
        break;
      }

      for (const q of data.results) {
        // Use the raw question text as the dedupe key (OpenTDB returns HTML-escaped text).
        // This prevents duplicates within the response array.
        const key = String(q.question).trim();
        if (!seen.has(key)) {
          seen.add(key);
          collected.push(q);
          if (collected.length >= amount) break;
        }
      }

      remaining = amount - collected.length;

      // If API returned fewer results than requested and we still need more, loop again.
      // The next request will ask for the smaller `remaining` amount.
      if (data.results.length === 0) break;
    }

    // If after attempts we still don't have enough, supplement with SAMPLE_QUESTIONS (deduped)
    if (collected.length < amount) {
      const needed = amount - collected.length;
      const supplemental = SAMPLE_QUESTIONS.results.filter((q: any) => !seen.has(q.question)).slice(0, needed);
      collected.push(...supplemental);
    }

    if (collected.length === 0) {
      // return sample questions as last resort
      return NextResponse.json(SAMPLE_QUESTIONS);
    }

    // Shuffle final results so the order is random
    const shuffled = collected.sort(() => Math.random() - 0.5).slice(0, amount);

    return NextResponse.json({ response_code: 0, results: shuffled });
  } catch (error) {
    console.error('Error fetching questions:', error);
    // Fallback to sample questions if something goes wrong
    return NextResponse.json(SAMPLE_QUESTIONS);
  }
}
