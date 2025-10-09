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
  userName: string;
  tPoints: number;
  timestamp: number;
}
