import { create } from 'zustand';

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  color: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  date: string;
  flashcards: Flashcard[];
  totalCards: number;
  createdAt: string;
}

interface FlashcardState {
  flashcardSets: FlashcardSet[];
  currentSet: FlashcardSet | null;
  isLoading: boolean;

  // Actions
  createFlashcardSet: (title: string, date: string, numCards: number) => string;
  addFlashcard: (setId: string, question: string, answer: string, color: string) => void;
  updateFlashcard: (setId: string, cardId: string, updates: Partial<Flashcard>) => void;
  deleteFlashcard: (setId: string, cardId: string) => void;
  getFlashcardSet: (setId: string) => FlashcardSet | undefined;
  setCurrentSet: (setId: string | null) => void;
  deleteFlashcardSet: (setId: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const flashcardColors = [
  '#FFD1B8',
  '#B8E0D8',
  '#FFE0A8',
  '#C8E0B8',
];

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  flashcardSets: [],
  currentSet: null,
  isLoading: false,

  createFlashcardSet: (title, date, numCards) => {
    const newSetId = generateId();
    const newSet: FlashcardSet = {
      id: newSetId,
      title,
      date,
      flashcards: [],
      totalCards: numCards,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      flashcardSets: [...state.flashcardSets, newSet],
      currentSet: newSet,
    }));
    return newSetId;
  },

  addFlashcard: (setId, question, answer, color) => {
    const newCard: Flashcard = {
      id: generateId(),
      question,
      answer,
      color,
    };
    set((state) => ({
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === setId
          ? { ...set, flashcards: [...set.flashcards, newCard] }
          : set
      ),
      currentSet:
        state.currentSet?.id === setId
          ? { ...state.currentSet, flashcards: [...state.currentSet.flashcards, newCard] }
          : state.currentSet,
    }));
  },

  updateFlashcard: (setId, cardId, updates) => {
    set((state) => ({
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              flashcards: set.flashcards.map((card) =>
                card.id === cardId ? { ...card, ...updates } : card
              ),
            }
          : set
      ),
    }));
  },

  deleteFlashcard: (setId, cardId) => {
    set((state) => ({
      flashcardSets: state.flashcardSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              flashcards: set.flashcards.filter((card) => card.id !== cardId),
              totalCards: Math.max(0, set.totalCards - 1),
            }
          : set
      ),
    }));
  },

  getFlashcardSet: (setId) => {
    return get().flashcardSets.find((set) => set.id === setId);
  },

  setCurrentSet: (setId) => {
    if (setId === null) {
      set({ currentSet: null });
      return;
    }
    const flashcardSet = get().flashcardSets.find((set) => set.id === setId);
    if (flashcardSet) {
      set({ currentSet: flashcardSet });
    }
  },

  deleteFlashcardSet: (setId) => {
    set((state) => ({
      flashcardSets: state.flashcardSets.filter((set) => set.id !== setId),
      currentSet: state.currentSet?.id === setId ? null : state.currentSet,
    }));
  },
}));

// Export color palette for use in components
export const FLASHCARD_COLORS = flashcardColors;
