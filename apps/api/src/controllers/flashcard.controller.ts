import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import FlashcardSet from '../models/FlashcardSet';
import Note from '../models/Note';
import ChatSession from '../models/ChatSession';
import flashcardGenerationService from '../services/flashcardGeneration.service';
import { checkQuota, incrementQuota, QuotaExceededError } from '../services/quota.service';

class FlashcardController {
  /**
   * Generate flashcards from note
   */
  async generateFlashcards(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = req.user._id;
      const { noteId, cardCount = 20, difficulty = 'medium', focusTopics = [], targetLanguage } = req.body;

      try {
        checkQuota(req.user, 'flashcards');
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          return res.status(402).json({ success: false, quotaExceeded: true, feature: e.feature, message: e.message });
        }
        throw e;
      }

      // Validate noteId
      if (!noteId) {
        return res.status(400).json({
          success: false,
          message: 'Note ID is required',
        });
      }

      // Validate card count
      if (cardCount < 1 || cardCount > 100) {
        return res.status(400).json({
          success: false,
          message: 'Card count must be between 1 and 100',
        });
      }

      // Validate difficulty
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: 'Difficulty must be easy, medium, or hard',
        });
      }

      // Validate note exists and belongs to user
      const note = await Note.findOne({ _id: noteId, userId });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Note not found',
        });
      }

      if (!note.content || note.content.trim().length < 100) {
        return res.status(400).json({
          success: false,
          message: 'Note content is too short to generate flashcards. Minimum 100 characters required.',
        });
      }

      console.log(`[${req.correlationId}] 🃏 Generating flashcards for note ${noteId}...`);

      // Resolve effective target language: note override → user preference → user UI language → English
      const effectiveLanguage = targetLanguage || note.studyLanguage || req.user.studyLanguage || req.user.preferredLanguage || 'en';

      // Generate flashcards
      const flashcards = await flashcardGenerationService.generateFlashcards(
        note.content,
        note.title,
        {
          cardCount,
          difficulty,
          focusTopics,
          targetLanguage: effectiveLanguage,
        }
      );

      // Create flashcard set
      const flashcardSet = await FlashcardSet.create({
        userId,
        noteId,
        title: `${note.title} - Flashcards`,
        cards: flashcards.map(card => ({
          front: card.front,
          back: card.back,
          color: card.color,
          mastered: false,
          reviewCount: 0,
        })),
        totalCards: flashcards.length,
        masteredCards: 0,
      });
      incrementQuota(userId.toString(), 'flashcards');

      console.log(`[${req.correlationId}] ✅ Generated ${flashcards.length} flashcards`);

      return res.status(201).json({
        success: true,
        message: 'Flashcards generated successfully',
        data: flashcardSet,
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] ❌ Error generating flashcards:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate flashcards',
        error: error.message,
      });
    }
  }

  /**
   * Generate flashcards directly from raw text (e.g. a chat answer) — no saved Note required.
   * POST /api/v1/flashcards/generate-from-text
   */
  async generateFlashcardsFromText(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = req.user._id;
      const { content, title = 'Flashcards', cardCount = 20, difficulty = 'medium', focusTopics = [], targetLanguage, chatSessionId } = req.body;

      try {
        checkQuota(req.user, 'flashcards');
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          return res.status(402).json({ success: false, quotaExceeded: true, feature: e.feature, message: e.message });
        }
        throw e;
      }

      if (!content || typeof content !== 'string' || content.trim().length < 100) {
        return res.status(400).json({
          success: false,
          message: 'content is required and must be at least 100 characters',
        });
      }

      if (cardCount < 1 || cardCount > 100) {
        return res.status(400).json({
          success: false,
          message: 'Card count must be between 1 and 100',
        });
      }

      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: 'Difficulty must be easy, medium, or hard',
        });
      }

      console.log(`[${req.correlationId}] 🃏 Generating flashcards from raw text (title: "${title}")...`);

      const effectiveLanguage = targetLanguage || req.user.studyLanguage || req.user.preferredLanguage || 'en';

      const flashcards = await flashcardGenerationService.generateFlashcards(
        content,
        title,
        {
          cardCount,
          difficulty,
          focusTopics,
          targetLanguage: effectiveLanguage,
        }
      );

      const flashcardSet = await FlashcardSet.create({
        userId,
        chatSessionId: chatSessionId || undefined,
        title: `${title} - Flashcards`,
        cards: flashcards.map(card => ({
          front: card.front,
          back: card.back,
          color: card.color,
          mastered: false,
          reviewCount: 0,
        })),
        totalCards: flashcards.length,
        masteredCards: 0,
      });
      incrementQuota(userId.toString(), 'flashcards');

      console.log(`[${req.correlationId}] ✅ Generated ${flashcards.length} flashcards from raw text`);

      return res.status(201).json({
        success: true,
        message: 'Flashcards generated successfully',
        data: flashcardSet,
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] ❌ Error generating flashcards from text:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate flashcards',
        error: error.message,
      });
    }
  }

  /**
   * Get flashcard set
   */
  async getFlashcardSet(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = req.user._id;
      const { setId } = req.params;

      const flashcardSet = await FlashcardSet.findOne({ _id: setId, userId })
        .populate('noteId', 'title');

      if (!flashcardSet) {
        return res.status(404).json({
          success: false,
          message: 'Flashcard set not found',
        });
      }

      return res.json({
        success: true,
        data: flashcardSet,
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] ❌ Error getting flashcard set:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get flashcard set',
        error: error.message,
      });
    }
  }

  /**
   * List flashcard sets for note
   */
  async listFlashcardSets(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = req.user._id;
      const { noteId, chatSessionId } = req.query;

      const query: any = { userId };
      if (noteId) {
        query.noteId = noteId;
      }
      if (chatSessionId) {
        query.chatSessionId = chatSessionId;
      }

      const flashcardSets = await FlashcardSet.find(query)
        .sort({ createdAt: -1 })
        .populate('noteId', 'title');

      return res.json({
        success: true,
        data: flashcardSets,
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] ❌ Error listing flashcard sets:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list flashcard sets',
        error: error.message,
      });
    }
  }

  /**
   * Get flashcard sets grouped by their originating note/chat, one row per source — mirrors
   * quiz.controller.ts's getQuizGroups so "New Flashcards" retakes don't create separate
   * top-level history entries.
   * GET /api/v1/flashcards/groups
   */
  async getFlashcardGroups(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const sets = await FlashcardSet.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .select('title noteId chatSessionId totalCards masteredCards createdAt')
        .lean();

      interface GroupAcc {
        groupKey: string;
        sourceType: 'note' | 'chat' | 'standalone';
        noteId?: string;
        chatSessionId?: string;
        setId?: string;
        title: string;
        createdAt: Date;
        lastProgress: { mastered: number; total: number };
        bestProgress: { mastered: number; total: number };
        setCount: number;
      }

      const groups = new Map<string, GroupAcc>();

      // Sets are sorted desc by createdAt, so the first one seen per group key is the most
      // recent set — used for the row's headline title/date.
      for (const set of sets as any[]) {
        const key = set.noteId
          ? `note:${set.noteId}`
          : set.chatSessionId
          ? `chat:${set.chatSessionId}`
          : `standalone:${set._id}`;

        const progress = { mastered: set.masteredCards, total: set.totalCards };
        const existing = groups.get(key);

        if (!existing) {
          groups.set(key, {
            groupKey: key,
            sourceType: set.noteId ? 'note' : set.chatSessionId ? 'chat' : 'standalone',
            noteId: set.noteId?.toString(),
            chatSessionId: set.chatSessionId?.toString(),
            setId: !set.noteId && !set.chatSessionId ? set._id.toString() : undefined,
            title: set.title,
            createdAt: set.createdAt,
            lastProgress: progress,
            bestProgress: progress,
            setCount: 1,
          });
        } else {
          existing.setCount += 1;
          const pct = progress.total > 0 ? progress.mastered / progress.total : 0;
          const bestPct = existing.bestProgress.total > 0 ? existing.bestProgress.mastered / existing.bestProgress.total : 0;
          if (pct > bestPct) {
            existing.bestProgress = progress;
          }
        }
      }

      const groupList = Array.from(groups.values());

      const noteIds = groupList.filter((g) => g.sourceType === 'note').map((g) => g.noteId!);
      const chatIds = groupList.filter((g) => g.sourceType === 'chat').map((g) => g.chatSessionId!);

      const [notes, chatSessions] = await Promise.all([
        noteIds.length ? Note.find({ _id: { $in: noteIds } }).select('title').lean() : Promise.resolve([]),
        chatIds.length ? ChatSession.find({ _id: { $in: chatIds } }).select('title').lean() : Promise.resolve([]),
      ]);

      const noteTitleMap = new Map(notes.map((n: any) => [n._id.toString(), n.title]));
      const chatTitleMap = new Map(chatSessions.map((c: any) => [c._id.toString(), c.title]));

      const result = groupList
        .map((g) => ({
          ...g,
          sourceTitle:
            g.sourceType === 'note'
              ? noteTitleMap.get(g.noteId!) || g.title
              : g.sourceType === 'chat'
              ? chatTitleMap.get(g.chatSessionId!) || g.title
              : g.title,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error fetching flashcard groups:`, error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Get every flashcard set generated under a single note or chat session, plus the source's
   * own title/date and aggregate progress stats.
   * GET /api/v1/flashcards/group?noteId=X or ?chatSessionId=Y
   */
  async getFlashcardGroupDetail(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { noteId, chatSessionId } = req.query;

      if (!noteId && !chatSessionId) {
        return res.status(400).json({ success: false, message: 'noteId or chatSessionId is required' });
      }

      const filter: any = { userId: req.user._id };
      if (noteId) filter.noteId = noteId;
      if (chatSessionId) filter.chatSessionId = chatSessionId;

      const sets = await FlashcardSet.find(filter)
        .sort({ createdAt: 1 })
        .select('title totalCards masteredCards createdAt')
        .lean();

      if (sets.length === 0) {
        return res.status(404).json({ success: false, message: 'No flashcard sets found for this source' });
      }

      let source: { type: 'note' | 'chat'; id: string; title: string; createdAt: Date } | null = null;
      if (noteId) {
        const note = await Note.findOne({ _id: noteId, userId: req.user._id }).select('title createdAt').lean();
        if (note) {
          source = { type: 'note', id: (note as any)._id.toString(), title: (note as any).title, createdAt: (note as any).createdAt };
        }
      } else if (chatSessionId) {
        const session = await ChatSession.findOne({ _id: chatSessionId, userId: req.user._id }).select('title createdAt').lean();
        if (session) {
          source = { type: 'chat', id: (session as any)._id.toString(), title: (session as any).title, createdAt: (session as any).createdAt };
        }
      }

      const bestSet = sets.reduce((best: any, s: any) => {
        if (!best) return s;
        const pct = s.totalCards > 0 ? s.masteredCards / s.totalCards : 0;
        const bestPct = best.totalCards > 0 ? best.masteredCards / best.totalCards : 0;
        return pct > bestPct ? s : best;
      }, null as any);
      const latestSet = sets[sets.length - 1] as any;

      return res.json({
        success: true,
        data: {
          source,
          sets: sets.map((s: any, index: number) => ({
            setId: s._id.toString(),
            label: `Set ${index + 1}`,
            title: s.title,
            totalCards: s.totalCards,
            masteredCards: s.masteredCards,
            createdAt: s.createdAt,
          })),
          lastProgress: { mastered: latestSet.masteredCards, total: latestSet.totalCards },
          bestProgress: { mastered: bestSet.masteredCards, total: bestSet.totalCards },
          setCount: sets.length,
          latestSetId: latestSet._id.toString(),
          latestCardCount: latestSet.totalCards,
        },
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error fetching flashcard group detail:`, error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Update flashcard
   */
  async updateFlashcard(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = req.user._id;
      const { setId, cardId } = req.params;
      const { front, back, color, mastered } = req.body;

      const flashcardSet = await FlashcardSet.findOne({ _id: setId, userId });

      if (!flashcardSet) {
        return res.status(404).json({
          success: false,
          message: 'Flashcard set not found',
        });
      }

      const card = (flashcardSet.cards as any).id(cardId);

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Flashcard not found',
        });
      }

      // Update card fields
      if (front !== undefined) card.front = front;
      if (back !== undefined) card.back = back;
      if (color !== undefined) card.color = color;
      if (mastered !== undefined) {
        card.mastered = mastered;

        // Update mastered count
        const masteredCount = flashcardSet.cards.filter(c => c.mastered).length;
        flashcardSet.masteredCards = masteredCount;
      }

      await flashcardSet.save();

      return res.json({
        success: true,
        message: 'Flashcard updated',
        data: flashcardSet,
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] ❌ Error updating flashcard:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update flashcard',
        error: error.message,
      });
    }
  }

  /**
   * Mark flashcard as reviewed
   */
  async reviewFlashcard(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = req.user._id;
      const { setId, cardId } = req.params;
      const { mastered } = req.body;

      const flashcardSet = await FlashcardSet.findOne({ _id: setId, userId });

      if (!flashcardSet) {
        return res.status(404).json({
          success: false,
          message: 'Flashcard set not found',
        });
      }

      const card = (flashcardSet.cards as any).id(cardId);

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Flashcard not found',
        });
      }

      // Update review data
      card.reviewCount += 1;
      card.lastReviewedAt = new Date();

      if (mastered !== undefined) {
        card.mastered = mastered;
      }

      // Update mastered count
      const masteredCount = flashcardSet.cards.filter(c => c.mastered).length;
      flashcardSet.masteredCards = masteredCount;

      await flashcardSet.save();

      return res.json({
        success: true,
        message: 'Flashcard reviewed successfully',
        data: {
          card,
          progress: {
            totalCards: flashcardSet.totalCards,
            masteredCards: flashcardSet.masteredCards,
            percentage: Math.round((flashcardSet.masteredCards / flashcardSet.totalCards) * 100),
          },
        },
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] ❌ Error reviewing flashcard:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to review flashcard',
        error: error.message,
      });
    }
  }

  /**
   * Delete flashcard set
   */
  async deleteFlashcardSet(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = req.user._id;
      const { setId } = req.params;

      const flashcardSet = await FlashcardSet.findOneAndDelete({
        _id: setId,
        userId,
      });

      if (!flashcardSet) {
        return res.status(404).json({
          success: false,
          message: 'Flashcard set not found',
        });
      }

      return res.json({
        success: true,
        message: 'Flashcard set deleted',
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] ❌ Error deleting flashcard set:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete flashcard set',
        error: error.message,
      });
    }
  }

  /**
   * Get flashcard set statistics
   */
  async getStatistics(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const userId = req.user._id;
      const { setId } = req.params;

      const flashcardSet = await FlashcardSet.findOne({ _id: setId, userId });

      if (!flashcardSet) {
        return res.status(404).json({
          success: false,
          message: 'Flashcard set not found',
        });
      }

      const totalReviews = flashcardSet.cards.reduce((sum, card) => sum + card.reviewCount, 0);
      const averageReviews = totalReviews / flashcardSet.totalCards;

      return res.json({
        success: true,
        data: {
          totalCards: flashcardSet.totalCards,
          masteredCards: flashcardSet.masteredCards,
          notMasteredCards: flashcardSet.totalCards - flashcardSet.masteredCards,
          totalReviews,
          averageReviews: Math.round(averageReviews * 10) / 10,
          masteryPercentage: Math.round((flashcardSet.masteredCards / flashcardSet.totalCards) * 100),
        },
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] ❌ Error getting statistics:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message,
      });
    }
  }

  /**
   * Export flashcard set questions
   * GET /api/v1/flashcards/:setId/export/questions?format=pdf|txt
   */
  async exportQuestions(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { setId } = req.params;
      const { format = 'pdf' } = req.query;

      // Validate format
      if (!['pdf', 'txt', 'docx'].includes(format as string)) {
        return res.status(400).json({ success: false, message: 'Invalid format. Use pdf, txt, or docx' });
      }

      const FlashcardSet = (await import('../models/FlashcardSet')).default;

      // Get flashcard set
      const set = await FlashcardSet.findOne({
        _id: setId,
        userId: req.user._id,
      });

      if (!set) {
        return res.status(404).json({ success: false, message: 'Flashcard set not found' });
      }

      let content: Buffer | string;
      let filename: string;

      if (format === 'docx') {
        const flashcardExportDOCXService = (await import('../services/flashcardExportDOCX.service')).default;
        content = await flashcardExportDOCXService.exportQuestionsToDOCX(set);
        filename = flashcardExportDOCXService.getExportFilename(set.title, false, 'docx');
      } else {
        const flashcardExportService = (await import('../services/flashcardExport.service')).default;
        content = await flashcardExportService.exportQuestions(set, format as 'pdf' | 'txt');
        filename = flashcardExportService.getExportFilename(set.title, false, format as 'pdf' | 'txt');
      }

      // Set response headers for file download
      const buffer = typeof content === 'string' ? Buffer.from(content) : content;
      const mimeType = format === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : format === 'pdf'
        ? 'application/pdf'
        : 'text/plain';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Length', buffer.length);

      return res.send(buffer);
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error exporting flashcard questions:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export flashcard questions',
        error: error.message,
      });
    }
  }

  /**
   * Export flashcard set answers
   * GET /api/v1/flashcards/:setId/export/answers?format=pdf|txt|docx
   */
  async exportAnswers(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { setId } = req.params;
      const { format = 'pdf' } = req.query;

      // Validate format
      if (!['pdf', 'txt', 'docx'].includes(format as string)) {
        return res.status(400).json({ success: false, message: 'Invalid format. Use pdf, txt, or docx' });
      }

      const FlashcardSet = (await import('../models/FlashcardSet')).default;

      // Get flashcard set
      const set = await FlashcardSet.findOne({
        _id: setId,
        userId: req.user._id,
      });

      if (!set) {
        return res.status(404).json({ success: false, message: 'Flashcard set not found' });
      }

      let content: Buffer | string;
      let filename: string;

      if (format === 'docx') {
        const flashcardExportDOCXService = (await import('../services/flashcardExportDOCX.service')).default;
        content = await flashcardExportDOCXService.exportAnswersToDOCX(set);
        filename = flashcardExportDOCXService.getExportFilename(set.title, true, 'docx');
      } else {
        const flashcardExportService = (await import('../services/flashcardExport.service')).default;
        content = await flashcardExportService.exportAnswers(set, format as 'pdf' | 'txt');
        filename = flashcardExportService.getExportFilename(set.title, true, format as 'pdf' | 'txt');
      }

      // Set response headers for file download
      const buffer = typeof content === 'string' ? Buffer.from(content) : content;
      const mimeType = format === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : format === 'pdf'
        ? 'application/pdf'
        : 'text/plain';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Length', buffer.length);

      return res.send(buffer);
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error exporting flashcard answers:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export flashcard answers',
        error: error.message,
      });
    }
  }

}

export default new FlashcardController();
