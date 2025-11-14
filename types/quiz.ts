export interface Question {
  id?: string;
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  explanation?: string;
  tags?: string[];
}

export interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  answers: (string | null)[];
  timeRemaining: number;
  quizStarted: boolean;
  quizCompleted: boolean;
  consecutiveCorrect: number;
  tPoints: number;
}

export interface ApiResponse {
  response_code: number;
  results: Question[];
}

export interface LeaderboardEntry {
  walletAddress: string;
  tPoints: number;
}
