import mongoose, { Document, Schema } from 'mongoose';

interface IQuizQuestion {
  questionText: string;
  questionType: 'multiple-choice' | 'true-false' | 'fill-blank';
  options: string[];
  correctAnswer: number | string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface IQuiz extends Document {
  userId: mongoose.Types.ObjectId;
  /** Absent for quizzes generated directly from chat-answer text rather than a saved Note. */
  noteId?: mongoose.Types.ObjectId;
  /** Set when this quiz was generated from a chat transcript — links attempts back to the
   *  originating session so they can be grouped together instead of appearing as separate,
   *  unrelated entries in quiz history. */
  chatSessionId?: mongoose.Types.ObjectId;
  title: string;
  questions: IQuizQuestion[];
  totalQuestions: number;
  /** Stored as Mixed (not number[]) since submitted answers may be numeric option indices
   *  or string values depending on question type — see quiz.controller.ts submitQuiz(). */
  userAnswers: any[];
  correctAnswers: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>({
  questionText: {
    type: String,
    required: true,
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'fill-blank'],
    default: 'multiple-choice',
  },
  options: {
    type: [String],
    required: true,
  },
  correctAnswer: {
    type: Schema.Types.Mixed,
    required: true,
  },
  explanation: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
}, { _id: false });

const QuizSchema = new Schema<IQuiz>(
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
    questions: {
      type: [QuizQuestionSchema],
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    // Mongoose's TS definitions can't cleanly resolve the "array of Mixed" shorthand against
    // a generic Schema<IQuiz> — this is a known rough edge (mongoose/mongoose#12420), not a
    // real type error; the `as any` only affects compilation, the runtime schema is unchanged.
    userAnswers: {
      type: [Schema.Types.Mixed],
      default: [],
    } as any,
    correctAnswers: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
QuizSchema.index({ userId: 1, createdAt: -1 });
QuizSchema.index({ userId: 1, noteId: 1 });

export default mongoose.model<IQuiz>('Quiz', QuizSchema);
