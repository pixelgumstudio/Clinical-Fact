export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Quiz {
  id: string;
  userId: string;
  noteId: string;
  name: string;
  questions: QuizQuestion[];
  timeLimit: number;
  createdAt: Date;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: Map<string, string>;
  score: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  completedAt: Date;
}

export interface CreateQuizRequest {
  noteId: string;
  name: string;
  timeLimit?: number;
}

export interface SubmitQuizRequest {
  quizId: string;
  answers: Record<string, string>;
}
