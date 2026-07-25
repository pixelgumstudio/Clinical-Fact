import { create } from 'zustand';

export interface QuizResult {
  id: string;
  noteId: string;
  noteTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  timeTaken: number;
  grade: string;
  createdAt: string;
}

interface QuizState {
  quizzes: QuizResult[];
  isLoading: boolean;

  // Actions
  addQuizResult: (quiz: Omit<QuizResult, 'id' | 'createdAt'>) => void;
  getQuizzesByNote: (noteId: string) => QuizResult[];
  deleteQuiz: (quizId: string) => void;
  clearQuizzes: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const getGrade = (percent: number) => {
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B+';
  if (percent >= 60) return 'C+';
  if (percent >= 50) return 'C';
  if (percent >= 40) return 'D';
  return 'F';
};

export const useQuizStore = create<QuizState>((set, get) => ({
  quizzes: [],
  isLoading: false,

  addQuizResult: (quiz) => {
    const percentage = Math.round((quiz.correctAnswers / quiz.totalQuestions) * 100);
    const newQuiz: QuizResult = {
      ...quiz,
      id: generateId(),
      percentage,
      grade: getGrade(percentage),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      quizzes: [...state.quizzes, newQuiz],
    }));
  },

  getQuizzesByNote: (noteId) => {
    return get().quizzes.filter((quiz) => quiz.noteId === noteId);
  },

  deleteQuiz: (quizId) => {
    set((state) => ({
      quizzes: state.quizzes.filter((quiz) => quiz.id !== quizId),
    }));
  },

  clearQuizzes: () => {
    set({ quizzes: [] });
  },
}));
