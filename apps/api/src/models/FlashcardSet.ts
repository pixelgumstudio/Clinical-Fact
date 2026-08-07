import mongoose, { Document, Schema } from 'mongoose';

interface IFlashcard {
  front: string;
  back: string;
  color?: string;
  mastered: boolean;
  reviewCount: number;
  lastReviewedAt?: Date;
}

export interface IFlashcardSet extends Document {
  userId: mongoose.Types.ObjectId;
  /** Absent for flashcard sets generated directly from chat-answer text rather than a saved Note. */
  noteId?: mongoose.Types.ObjectId;
  /** Set when this set was generated from a chat transcript — links sets back to the
   *  originating session so they can be grouped with that chat's quizzes. */
  chatSessionId?: mongoose.Types.ObjectId;
  title: string;
  cards: IFlashcard[];
  totalCards: number;
  masteredCards: number;
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema = new Schema<IFlashcard>({
  front: {
    type: String,
    required: true,
  },
  back: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: '#007AFF',
  },
  mastered: {
    type: Boolean,
    default: false,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  lastReviewedAt: {
    type: Date,
  },
}, { _id: true });

const FlashcardSetSchema = new Schema<IFlashcardSet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    noteId: {
      type: Schema.Types.ObjectId,
      ref: 'Note',
      required: false,
      index: true,
    },
    chatSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: false,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    cards: {
      type: [FlashcardSchema],
      required: true,
    },
    totalCards: {
      type: Number,
      required: true,
    },
    masteredCards: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
FlashcardSetSchema.index({ userId: 1, createdAt: -1 });
FlashcardSetSchema.index({ userId: 1, noteId: 1 });

export default mongoose.model<IFlashcardSet>('FlashcardSet', FlashcardSetSchema);
