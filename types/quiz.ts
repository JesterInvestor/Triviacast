export interface Question {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
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

export interface QuizResult {
  quizId: string;
  walletAddress: string;
  score: number;
  totalQuestions: number;
  tPoints: number;
  questions: Question[];
  answers: (string | null)[];
  completedAt: Date;
  timeRemaining: number;
}

export interface ScoringResult {
  points: number;
  isCorrect: boolean;
  consecutiveCorrect: number;
}
