import mongoose, { Document, Schema } from 'mongoose';

interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** Image attached to this message (e.g. a photo sent alongside the question). The
   *  resolvable URL is computed on read from `attachmentFileId` (see chat.controller
   *  getChatSession) rather than stored, since MinIO presigned URLs expire. */
  attachmentFileId?: mongoose.Types.ObjectId;
  attachmentMimeType?: string;
}

/**
 * Any note/document attached to this session — either the one it was created from, or one
 * added later via the "+" attach action mid-conversation. All attached sources' content is
 * embedded into the same session's Qdrant space (see chatService.embedDocument), so a session
 * can accumulate multiple sources of context over time, not just the single one it started with.
 */
interface IAttachedSource {
  type: 'note' | 'file';
  refId: mongoose.Types.ObjectId;
  title: string;
  attachedAt: Date;
}

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  noteId?: mongoose.Types.ObjectId;
  fileId?: mongoose.Types.ObjectId;
  folderId?: mongoose.Types.ObjectId;
  title: string;
  /** One-sentence, AI-generated summary of the conversation — shown in the session list in
   *  place of the raw last message. Regenerated after every assistant reply (see
   *  chat.controller's async job handler); undefined until the first exchange completes. */
  summary?: string;
  sourceType: 'note' | 'image' | 'document' | 'pdf' | 'audio' | 'medical_qa';
  sourceContent?: string;
  attachedSources: IAttachedSource[];
  messages: IChatMessage[];
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  embeddingProgress: number;
  metadata: {
    chunksCount?: number;
    totalTokens?: number;
    modelUsed?: string;
  };
  /** Set when the user pins/bookmarks this chat — pinned chats sort to the top of the list
   *  (see chat.controller listChatSessions). Null/undefined means not pinned. */
  pinnedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    attachmentFileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
    },
    attachmentMimeType: {
      type: String,
    },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
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
      index: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      ref: 'File',
      index: true,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ['note', 'image', 'document', 'pdf', 'audio', 'medical_qa'],
      required: true,
    },
    sourceContent: {
      type: String,
    },
    attachedSources: {
      type: [
        {
          type: {
            type: String,
            enum: ['note', 'file'],
            required: true,
          },
          refId: {
            type: Schema.Types.ObjectId,
            required: true,
          },
          title: {
            type: String,
            required: true,
          },
          attachedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
      _id: false,
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
    },
    embeddingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    embeddingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    metadata: {
      chunksCount: Number,
      totalTokens: Number,
      modelUsed: String,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ChatSessionSchema.index({ userId: 1, createdAt: -1 });
ChatSessionSchema.index({ userId: 1, sourceType: 1 });
ChatSessionSchema.index({ userId: 1, embeddingStatus: 1 });
ChatSessionSchema.index({ userId: 1, folderId: 1 });
ChatSessionSchema.index({ userId: 1, pinnedAt: -1 });

export default mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
