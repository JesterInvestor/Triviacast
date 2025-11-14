import { NextResponse } from 'next/server';
import { getQuestions } from '@/lib/questions';

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
  const source = searchParams.get('source') || 'opentdb'; // default to OpenTDB
  const difficulty = searchParams.get('difficulty') || '';

  try {
    const questions = await getQuestions(
      source as 'opentdb' | 'farcaster',
      amount,
      difficulty
    );

    if (questions.length === 0) {
      // return sample questions as last resort
      return NextResponse.json(SAMPLE_QUESTIONS);
    }

    return NextResponse.json({ response_code: 0, results: questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    // Fallback to sample questions if something goes wrong
    return NextResponse.json(SAMPLE_QUESTIONS);
  }
}
