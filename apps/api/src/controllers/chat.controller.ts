import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ChatSession from '../models/ChatSession';
import Note from '../models/Note';
import File from '../models/File';
import chatService from '../services/chat.service';
import pdfService from '../services/pdf.service';
import ocrService from '../services/ocr.service';
import { createJob, updateJob } from '../services/job.service';
import { checkQuota, incrementQuota, QuotaExceededError } from '../services/quota.service';
import notificationService from '../services/notification.service';

const MAX_PINNED_CHATS = 3;

class ChatController {
  /**
   * Create chat session from note
   */
  async createChatSessionFromNote(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Authentication required'
        });
      }
      const userId = req.user._id;
      const { noteId, folderId } = req.body;

      // Smart Resume: return the existing session if one already exists for this note.
      const existingSession = await ChatSession.findOne({ userId, noteId }).sort({ createdAt: -1 });
      if (existingSession) {
        console.log(`♻️  Resuming existing chat session ${existingSession._id} for note ${noteId}`);
        return res.json({
          success: true,
          message: 'Chat session retrieved successfully',
          data: existingSession,
        });
      }

      try {
        checkQuota(req.user, 'chats');
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          return res.status(402).json({ success: false, quotaExceeded: true, feature: e.feature, message: e.message });
        }
        throw e;
      }

      const note = await Note.findOne({ _id: noteId, userId });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Note not found',
          error: 'Note not found'
        });
      }

      if (!note.content || note.content.trim().length < 100) {
        return res.status(400).json({
          success: false,
          message: 'Note content is too short. Minimum 100 characters required.',
          error: 'Note content is too short. Minimum 100 characters required.'
        });
      }

      console.log(`💬 Creating chat session from note ${noteId}...`);

      // Prefer raw extracted content for RAG (avoid regenerating from enhanced note)
      const contentForEmbedding = note.extractedContent || note.transcriptText || note.content;

      // Create chat session
      const chatSession = await ChatSession.create({
        userId,
        noteId,
        folderId: folderId || null,
        title: `Chat with: ${note.title}`,
        sourceType: 'note',
        sourceContent: contentForEmbedding,
        messages: [],
        embeddingStatus: 'processing',
        embeddingProgress: 0,
      });

      incrementQuota(userId.toString(), 'chats');

      // Embed document in background using stored note content (if available)
      chatService.embedNoteDocument(note._id.toString(), chatSession._id.toString())
        .then(async (result) => {
          await ChatSession.findByIdAndUpdate(chatSession._id, {
            embeddingStatus: 'completed',
            embeddingProgress: 100,
            'metadata.chunksCount': result.chunksCount || undefined,
          });
          console.log(`✅ Document embedding completed for session ${chatSession._id}`);
        })
        .catch(async (error) => {
          console.error('❌ Error embedding document:', error);
          await ChatSession.findByIdAndUpdate(chatSession._id, {
            embeddingStatus: 'failed',
          });
        });

      res.json({
        success: true,
        message: 'Chat session created successfully',
        data: chatSession
      });
    } catch (error: any) {
      console.error('❌ Error creating chat session:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create chat session',
        error: 'Failed to create chat session'
      });
    }
  }

  /**
   * Create a standalone medical Q&A chat session — no note or document required.
   * This is the entry point for "ask anything" medical questions (sendMessage mode: 'medical_live').
   */
  async createMedicalChatSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Authentication required'
        });
      }
      const userId = req.user._id;

      try {
        checkQuota(req.user, 'medicalChats');
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          return res.status(402).json({ success: false, quotaExceeded: true, feature: e.feature, message: e.message });
        }
        throw e;
      }

      // No note/file/embedding for this session type — mark embedding as already "completed"
      // so nothing in the existing embeddingStatus-gated UI ever shows a stuck processing state.
      const chatSession = await ChatSession.create({
        userId,
        title: 'New medical question',
        sourceType: 'medical_qa',
        messages: [],
        embeddingStatus: 'completed',
        embeddingProgress: 100,
      });

      incrementQuota(userId.toString(), 'medicalChats');

      res.json({
        success: true,
        message: 'Medical chat session created successfully',
        data: chatSession,
      });
    } catch (error: any) {
      console.error('❌ Error creating medical chat session:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create medical chat session',
        error: 'Failed to create medical chat session'
      });
    }
  }

  /**
   * Create chat session from document file
   */
  async createChatSessionFromDocument(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Authentication required'
        });
      }
      const userId = req.user._id;
      const { fileId, folderId } = req.body;

      try {
        checkQuota(req.user, 'chats');
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          return res.status(402).json({ success: false, quotaExceeded: true, feature: e.feature, message: e.message });
        }
        throw e;
      }

      const file = await File.findOne({ _id: fileId, userId });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
          error: 'File not found'
        });
      }

      console.log(`💬 Creating chat session from file ${fileId}...`);

      let documentText = '';
      let sourceType: 'document' | 'image' | 'pdf' | 'audio' = 'document';

      // Extract text based on file type
      if (file.fileType === 'pdf') {
        // Check cache first from upload endpoint
        if (file.metadata?.ocrText) {
          documentText = file.metadata.ocrText;
        } else {
          const pdfResult = await pdfService.extractText(file.fileKey);
          documentText = pdfResult.text;
        }
        sourceType = 'pdf';
      } else if (file.fileType === 'image') {
        // Check cache first from upload endpoint
        if (file.metadata?.ocrText) {
          documentText = file.metadata.ocrText;
        } else {
          const ocrResult = await ocrService.extractTextFromImage(file.fileKey);
          documentText = ocrResult.text;
        }
        sourceType = 'image';
      } else if (file.fileType === 'document' && file.metadata?.ocrText) {
        // Plain text upload (see uploadController.uploadPDFWithExtraction) — already extracted
        // synchronously at upload time, nothing to do here.
        documentText = file.metadata.ocrText;
        sourceType = 'document';
      } else if (file.fileType === 'audio' && file.metadata?.ocrText) {
        // Background transcription (see uploadController.uploadAudioWithTranscription) already
        // completed and cached — if it hasn't finished yet, ocrText won't be set and this falls
        // through to the "unsupported/not ready" error below rather than blocking on it here.
        documentText = file.metadata.ocrText;
        sourceType = 'audio';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unsupported file type, or the file is still processing. PDF, image, text, and audio files are supported.',
          error: 'Unsupported file type, or the file is still processing. PDF, image, text, and audio files are supported.'
        });
      }

      if (documentText.trim().length < 100) {
        return res.status(400).json({
          success: false,
          message: 'Extracted text is too short. Minimum 100 characters required.',
          error: 'Extracted text is too short. Minimum 100 characters required.'
        });
      }

      // Enhance raw text with AI structuring (same pipeline as note creation)
      let enhancedTitle: string | undefined;
      try {
        const noteGenerationService = (await import('../services/noteGeneration.service')).default;
        const enhanced = await noteGenerationService.generateNote(
          documentText,
          sourceType,  // 'pdf' | 'image' | 'document'
          {}           // no extra options
        );
        if (enhanced && enhanced.content) {
          documentText = enhanced.content;
        }
        if (enhanced && enhanced.title) {
          enhancedTitle = enhanced.title;
        }
      } catch (enhancementErr: any) {
        // Non-fatal: if AI enhancement fails, continue with raw text
        console.warn('⚠️ AI enhancement failed for chat document, using raw extraction:', enhancementErr);
      }

      // originalName is a device-generated filename for images (e.g. iOS's UUID-based temp
      // photo names) — not something to show a user, so prefer the AI-generated title (from
      // the actual content) and fall back to a generic label rather than that raw name.
      const fallbackTitle = sourceType === 'image' ? 'Chat from image' : `Chat with: ${file.originalName}`;

      // Create chat session
      const chatSession = await ChatSession.create({
        userId,
        fileId,
        folderId: folderId || null,
        title: enhancedTitle || fallbackTitle,
        sourceType,
        sourceContent: documentText,
        messages: [],
        embeddingStatus: 'processing',
        embeddingProgress: 0,
      });

      incrementQuota(userId.toString(), 'chats');

      // Embed document in background
      chatService.embedDocument(documentText, chatSession._id.toString(), {
        fileId,
        fileName: file.originalName,
      })
        .then(async () => {
          await ChatSession.findByIdAndUpdate(chatSession._id, {
            embeddingStatus: 'completed',
            embeddingProgress: 100,
          });
          console.log(`✅ Document embedding completed for session ${chatSession._id}`);
        })
        .catch(async (error) => {
          console.error('❌ Error embedding document:', error);
          await ChatSession.findByIdAndUpdate(chatSession._id, {
            embeddingStatus: 'failed',
          });
        });

      res.json({
        success: true,
        message: 'Chat session created successfully from document',
        data: chatSession
      });
    } catch (error: any) {
      console.error('❌ Error creating chat session from document:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create chat session from document',
        error: 'Failed to create chat session from document'
      });
    }
  }

  /**
   * Attach an additional note or file to an EXISTING chat session — embeds its content into
   * the same session's Qdrant space (additive, not a replacement) so subsequent messages can
   * draw on it alongside whatever the session already has. Works for any session type,
   * including medical_qa sessions (see chatService.chatMedicalLive's sessionId param, which
   * merges any attached-source context in alongside the live medical literature search).
   */
  async attachSourceToSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const userId = req.user._id;
      const { sessionId } = req.params;
      const { noteId, fileId } = req.body;

      if (!noteId && !fileId) {
        return res.status(400).json({ success: false, message: 'noteId or fileId is required' });
      }

      const chatSession = await ChatSession.findOne({ _id: sessionId, userId });
      if (!chatSession) {
        return res.status(404).json({ success: false, message: 'Chat session not found' });
      }

      let content = '';
      let title = '';
      let sourceType: 'note' | 'file';
      let refId: string;

      if (noteId) {
        const note = await Note.findOne({ _id: noteId, userId });
        if (!note) {
          return res.status(404).json({ success: false, message: 'Note not found' });
        }
        content = note.extractedContent || note.transcriptText || note.content || '';
        title = note.title;
        sourceType = 'note';
        refId = note._id.toString();
      } else {
        const file = await File.findOne({ _id: fileId, userId });
        if (!file) {
          return res.status(404).json({ success: false, message: 'File not found' });
        }

        if (file.fileType === 'pdf') {
          if (file.metadata?.ocrText) {
            content = file.metadata.ocrText;
          } else {
            const pdfResult = await pdfService.extractText(file.fileKey);
            content = pdfResult.text;
          }
        } else if (file.fileType === 'image') {
          if (file.metadata?.ocrText) {
            content = file.metadata.ocrText;
          } else {
            const ocrResult = await ocrService.extractTextFromImage(file.fileKey);
            content = ocrResult.text;
          }
        } else if (file.fileType === 'document' && file.metadata?.ocrText) {
          // Plain text upload — already extracted synchronously at upload time.
          content = file.metadata.ocrText;
        } else if (file.fileType === 'audio' && file.metadata?.ocrText) {
          // Background transcription already completed and cached.
          content = file.metadata.ocrText;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Unsupported file type. PDF, image, and text files are supported.',
          });
        }

        title = file.originalName;
        sourceType = 'file';
        refId = file._id.toString();
      }

      if (!content || content.trim().length < 100) {
        return res.status(400).json({
          success: false,
          message: 'Extracted content is too short. Minimum 100 characters required.',
        });
      }

      chatSession.attachedSources.push({ type: sourceType, refId: refId as any, title, attachedAt: new Date() });
      chatSession.embeddingStatus = 'processing';
      await chatSession.save();

      res.json({
        success: true,
        message: 'Source attached, embedding in progress',
        data: chatSession,
      });

      // Embed in background — client polls GET /chat/:sessionId, same mechanism used for the
      // session's initial source (see pollEmbeddingStatus on the mobile side).
      chatService.embedDocument(content, sessionId, { attachedTitle: title, attachedType: sourceType })
        .then(async (result) => {
          await ChatSession.findByIdAndUpdate(sessionId, {
            embeddingStatus: 'completed',
            embeddingProgress: 100,
            $inc: { 'metadata.chunksCount': result.chunksCount || 0 },
          });
          console.log(`✅ Attached-source embedding completed for session ${sessionId}`);
        })
        .catch(async (error) => {
          console.error('❌ Error embedding attached source:', error);
          await ChatSession.findByIdAndUpdate(sessionId, { embeddingStatus: 'failed' });
        });
    } catch (error: any) {
      console.error('❌ Error attaching source to session:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to attach source',
      });
    }
  }

  /**
   * Send message in chat session.
   * Returns 202 immediately with a jobId; AI response is generated asynchronously.
   * Client polls GET /api/v1/jobs/:jobId for the result.
   */
  async sendMessage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Authentication required'
        });
      }
      const userId = req.user._id;
      const { sessionId } = req.params;
      const { message, deepResearch = false, mode, filters, excludeImageUrls, attachmentFileId } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message cannot be empty',
          error: 'Message cannot be empty'
        });
      }

      const chatSession = await ChatSession.findOne({ _id: sessionId, userId });

      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
          error: 'Chat session not found'
        });
      }

      // Live medical mode bypasses the local Qdrant document store entirely,
      // so it doesn't need to wait on document embedding to finish.
      if (mode !== 'medical_live' && chatSession.embeddingStatus !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Document is still being processed. Please wait a moment.',
          error: 'Document is still being processed. Please wait a moment.',
          data: {
            embeddingStatus: chatSession.embeddingStatus,
            embeddingProgress: chatSession.embeddingProgress,
          }
        });
      }

      // Resolve+verify ownership of the attached image (if any) before persisting it on the
      // message — a bad/foreign fileId is silently dropped rather than failing the whole send.
      let attachmentFile: any = null;
      if (attachmentFileId) {
        attachmentFile = await File.findOne({ _id: attachmentFileId, userId }).select('mimeType');
      }

      // Persist user message synchronously so it is visible if the client refreshes.
      chatSession.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date(),
        ...(attachmentFile ? { attachmentFileId: attachmentFile._id, attachmentMimeType: attachmentFile.mimeType } : {}),
      });
      await chatSession.save();

      // Snapshot chat history for the async closure (the chatSession object may be mutated later).
      const chatHistory = chatSession.messages.map(msg => ({ role: msg.role, content: msg.content }));

      const jobId = await createJob(userId.toString(), 'chat_message');

      res.status(202).json({
        success: true,
        message: 'Message processing started',
        data: { jobId },
      });

      (async () => {
        try {
          console.log(`💬 Async processing message in session ${sessionId} (job ${jobId}, mode: ${mode || 'standard'})...`);

          let assistantContent: string;
          let jobResult: Record<string, any>;

          if (mode === 'medical_live') {
            const { text, sources, images, groundingSources, drugLabels } = await chatService.chatMedicalLive(
              message,
              chatHistory.slice(0, -1),
              filters,
              sessionId,
              Array.isArray(excludeImageUrls) ? excludeImageUrls : []
            );
            assistantContent = text;
            jobResult = { text, sources, images, groundingSources, drugLabels };
          } else {
            const { response, sources } = await chatService.chat(
              sessionId,
              message,
              chatHistory.slice(0, -1),
              !!deepResearch
            );
            assistantContent = response;
            jobResult = { response, sources };
          }

          // Re-fetch to avoid overwriting concurrent saves.
          const updated = await ChatSession.findById(sessionId);
          let generatedTitle: string | undefined;
          if (updated) {
            updated.messages.push({ role: 'assistant', content: assistantContent, timestamp: new Date() });

            // First exchange in this session — auto-title it from what was actually asked,
            // same as ChatGPT/Claude do, instead of leaving the generic default title.
            if (updated.messages.length === 2) {
              generatedTitle = await chatService.generateChatTitle(message, assistantContent);
              updated.title = generatedTitle;
            }

            await updated.save();
          }

          await updateJob(jobId, {
            status: 'completed',
            result: { ...jobResult, messageCount: updated?.messages.length ?? 0, title: generatedTitle },
          });

          // Send notification for chat message completion
          const sessionIdStr = sessionId.toString();
          await notificationService.sendJobCompletionNotification(
            userId.toString(),
            sessionIdStr,
            'chat',
            'completed'
          ).catch(err => console.error('Failed to send chat completion notification:', err));

        } catch (error: any) {
          console.error(`❌ Async chat error (job ${jobId}):`, error);
          await updateJob(jobId, {
            status: 'failed',
            error: error.message || 'Failed to get AI response',
          }).catch(() => {});

          // Send notification for chat message failure
          const sessionIdStr = sessionId.toString();
          await notificationService.sendJobCompletionNotification(
            userId.toString(),
            sessionIdStr,
            'chat',
            'failed'
          ).catch(err => console.error('Failed to send chat failure notification:', err));
        }
      })();

    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send message',
        error: 'Failed to send message'
      });
    }
  }

  /**
   * Get chat session
   */
  async getChatSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Authentication required'
        });
      }
      const userId = req.user._id;
      const { sessionId } = req.params;

      const chatSession = await ChatSession.findOne({ _id: sessionId, userId })
        .populate('noteId', 'title')
        .populate('fileId', 'originalName')
        .populate('folderId', 'name color');

      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
          error: 'Chat session not found'
        });
      }

      // Messages carry their own `attachmentFileId` already (see sendMessage) — the client
      // builds the actual image URL from it directly (GET /upload/:fileId/content), so there's
      // nothing to resolve here.
      res.json({
        success: true,
        message: 'Chat session retrieved successfully',
        data: chatSession
      });
    } catch (error: any) {
      console.error('❌ Error getting chat session:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get chat session',
        error: 'Failed to get chat session'
      });
    }
  }

  /**
   * List chat sessions
   */
  async listChatSessions(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Authentication required'
        });
      }
      const userId = req.user._id;
      const { page = 1, limit = 20, folderId } = req.query;

      // Validate pagination
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = { userId };
      if (folderId) {
        query.folderId = folderId;
      }

      const [sessions, total] = await Promise.all([
        ChatSession.find(query)
          // Pinned chats first (most recently pinned first), then the rest by activity.
          .sort({ pinnedAt: -1, updatedAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('noteId', 'title')
          .populate('fileId', 'originalName')
          .populate('folderId', 'name color'),
        ChatSession.countDocuments(query),
      ]);

      res.json({
        success: true,
        message: 'Chat sessions retrieved successfully',
        data: {
          sessions,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        }
      });
    } catch (error: any) {
      console.error('❌ Error listing chat sessions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to list chat sessions',
        error: 'Failed to list chat sessions'
      });
    }
  }

  /**
   * Update chat session (rename)
   */
  async updateChatSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const userId = req.user._id;
      const { sessionId } = req.params;
      const { title } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Title is required' });
      }

      const chatSession = await ChatSession.findOne({ _id: sessionId, userId });

      if (!chatSession) {
        return res.status(404).json({ success: false, message: 'Chat session not found' });
      }

      chatSession.title = title.trim();
      await chatSession.save();

      res.json({ success: true, message: 'Chat session updated successfully', data: chatSession });
    } catch (error: any) {
      console.error('❌ Error updating chat session:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update chat session' });
    }
  }

  /**
   * Pin/unpin (bookmark) a chat session. Pinned chats sort to the top of the list
   * (see listChatSessions), capped at MAX_PINNED_CHATS at a time.
   */
  async togglePinChatSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const userId = req.user._id;
      const { sessionId } = req.params;

      const chatSession = await ChatSession.findOne({ _id: sessionId, userId });
      if (!chatSession) {
        return res.status(404).json({ success: false, message: 'Chat session not found' });
      }

      if (chatSession.pinnedAt) {
        chatSession.pinnedAt = null;
      } else {
        const pinnedCount = await ChatSession.countDocuments({ userId, pinnedAt: { $ne: null } });
        if (pinnedCount >= MAX_PINNED_CHATS) {
          return res.status(400).json({
            success: false,
            message: `You can only pin up to ${MAX_PINNED_CHATS} chats. Unpin one first.`,
          });
        }
        chatSession.pinnedAt = new Date();
      }

      await chatSession.save();

      res.json({ success: true, message: 'Chat session updated successfully', data: chatSession });
    } catch (error: any) {
      console.error('❌ Error pinning chat session:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to pin chat session' });
    }
  }

  /**
   * Delete chat session
   */
  async deleteChatSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Authentication required'
        });
      }
      const userId = req.user._id;
      const { sessionId } = req.params;

      const chatSession = await ChatSession.findOne({ _id: sessionId, userId });

      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
          error: 'Chat session not found'
        });
      }

      // Delete embeddings from vector database
      await chatService.deleteSession(sessionId);

      // Delete chat session
      await chatSession.deleteOne();

      res.json({
        success: true,
        message: 'Chat session deleted successfully'
      });
    } catch (error: any) {
      console.error('❌ Error deleting chat session:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete chat session',
        error: 'Failed to delete chat session'
      });
    }
  }

  /**
   * Move chat session to folder
   */
  async moveChatToFolder(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Authentication required'
        });
      }
      const userId = req.user._id;
      const { sessionId } = req.params;
      const { folderId } = req.body;

      const chatSession = await ChatSession.findOne({ _id: sessionId, userId });

      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
          error: 'Chat session not found'
        });
      }

      // If folderId is provided, verify it exists
      if (folderId) {
        const Folder = (await import('../models/Folder')).default;
        const folder = await Folder.findOne({ _id: folderId, userId });

        if (!folder) {
          return res.status(404).json({
            success: false,
            message: 'Folder not found',
            error: 'Folder not found'
          });
        }
      }

      chatSession.folderId = folderId || undefined;
      await chatSession.save();

      res.json({
        success: true,
        message: 'Chat session moved successfully',
        data: chatSession
      });
    } catch (error: any) {
      console.error('❌ Error moving chat to folder:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to move chat to folder',
        error: 'Failed to move chat to folder'
      });
    }
  }

  /**
   * Get chat session statistics
   */
  async getStatistics(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'Authentication required'
        });
      }
      const userId = req.user._id;
      const { sessionId } = req.params;

      const chatSession = await ChatSession.findOne({ _id: sessionId, userId });

      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: 'Chat session not found',
          error: 'Chat session not found'
        });
      }

      const userMessages = chatSession.messages.filter(m => m.role === 'user').length;
      const assistantMessages = chatSession.messages.filter(m => m.role === 'assistant').length;

      res.json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: {
          totalMessages: chatSession.messages.length,
          userMessages,
          assistantMessages,
          embeddingStatus: chatSession.embeddingStatus,
          chunksCount: chatSession.metadata.chunksCount || 0,
          createdAt: chatSession.createdAt,
          lastActivity: chatSession.updatedAt,
        }
      });
    } catch (error: any) {
      console.error('❌ Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get statistics',
        error: 'Failed to get statistics'
      });
    }
  }
}

export default new ChatController();
