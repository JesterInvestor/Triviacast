import { NextResponse } from 'next/server';

// Fallback sample questions for when the API is unavailable
const SAMPLE_QUESTIONS = {
  response_code: 0,
  results: [
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
      category: "General Knowledge",
      type: "multiple",
      difficulty: "medium",
      question: "What is the capital of France?",
      correct_answer: "Paris",
      incorrect_answers: ["London", "Berlin", "Madrid"]
    },
    {
      category: "Science & Nature",
      type: "multiple",
      difficulty: "medium",
      question: "What is the chemical symbol for gold?",
      correct_answer: "Au",
      incorrect_answers: ["Go", "Gd", "Ag"]
    },
    {
      category: "History",
      type: "multiple",
      difficulty: "medium",
      question: "In what year did World War II end?",
      correct_answer: "1945",
      incorrect_answers: ["1944", "1946", "1943"]
    },
    {
      category: "Geography",
      type: "multiple",
      difficulty: "medium",
      question: "What is the largest ocean on Earth?",
      correct_answer: "Pacific Ocean",
      incorrect_answers: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"]
    },
    {
      category: "Entertainment: Music",
      type: "multiple",
      difficulty: "medium",
      question: "Which band released the album 'Abbey Road'?",
      correct_answer: "The Beatles",
      incorrect_answers: ["The Rolling Stones", "Led Zeppelin", "Pink Floyd"]
    },
    {
      category: "Science: Mathematics",
      type: "multiple",
      difficulty: "medium",
      question: "What is the value of Pi to two decimal places?",
      correct_answer: "3.14",
      incorrect_answers: ["3.12", "3.16", "3.18"]
    },
    {
      category: "Sports",
      type: "multiple",
      difficulty: "medium",
      question: "How many players are on a basketball team on the court?",
      correct_answer: "5",
      incorrect_answers: ["6", "7", "4"]
    },
    {
      category: "Entertainment: Film",
      type: "multiple",
      difficulty: "medium",
      question: "Who directed the movie 'Inception'?",
      correct_answer: "Christopher Nolan",
      incorrect_answers: ["Steven Spielberg", "James Cameron", "Quentin Tarantino"]
    },
    {
      category: "General Knowledge",
      type: "multiple",
      difficulty: "medium",
      question: "What is the hardest natural substance on Earth?",
      correct_answer: "Diamond",
      incorrect_answers: ["Gold", "Iron", "Platinum"]
    }
  ]
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const amount = searchParams.get('amount') || '10';
  const difficulty = searchParams.get('difficulty') || 'medium';
  const category = searchParams.get('category') || '';

  try {
    const url = `https://opentdb.com/api.php?amount=${amount}&difficulty=${difficulty}${category ? `&category=${category}` : ''}&type=multiple`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.response_code !== 0) {
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching questions:', error);
    console.log('Using sample questions as fallback');
    // Return sample questions as fallback
    return NextResponse.json(SAMPLE_QUESTIONS);
  }
}
