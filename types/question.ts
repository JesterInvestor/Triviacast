// Local question format (for Farcaster questions and other local question sets)
export interface LocalQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number; // 0-based index of correct answer
  explanation?: string;
  tags?: string[];
}

// OpenTDB API question format (existing format)
export interface OpenTDBQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

// Unified question format for the quiz component
export interface QuizQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category?: string;
  type?: string;
  difficulty?: string;
  explanation?: string;
  tags?: string[];
}

// Question source type
export type QuestionSource = 'opentdb' | 'farcaster';
