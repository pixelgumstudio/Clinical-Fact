import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Quiz from '../models/Quiz';
import Note from '../models/Note';
import ChatSession from '../models/ChatSession';
import quizGenerationService from '../services/quizGeneration.service';
import { checkQuota, incrementQuota, QuotaExceededError } from '../services/quota.service';

class QuizController {
  /**
   * Generate quiz from note
   * POST /api/v1/quizzes/generate
   */
  async generateQuiz(req: AuthRequest, res: Response) {
    try {
      // ✅ Ensure user is authenticated and has _id
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const {
        noteId,
        questionCount = 10,
        difficulty = 'medium',
        questionTypes = ['multiple-choice'],
        quizType = 'standard',
        targetLanguage,
      } = req.body;

      // Validation
      if (!noteId) {
        return res.status(400).json({
          success: false,
          message: 'Note ID is required',
        });
      }

      // ✅ Use consistent _id reference
      const userId = req.user._id;

      try {
        checkQuota(req.user, 'quizzes');
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          return res.status(402).json({ success: false, quotaExceeded: true, feature: e.feature, message: e.message });
        }
        throw e;
      }

      // Get note
      const note = await Note.findOne({
        _id: noteId,
        userId,
      });

      if (!note) {
        return res.status(404).json({
          success: false,
          message: 'Note not found',
        });
      }

      // Check if note has content
      if (!note.content || note.content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Note must have content to generate a quiz',
        });
      }

      // Resolve effective target language: provided → note override → user preference → user UI language → English
      const effectiveLanguage = targetLanguage || note.studyLanguage || req.user.studyLanguage || req.user.preferredLanguage || 'en';

      // Generate quiz based on type
      console.log(`🎯 Generating ${quizType} quiz for note: ${note.title}`);
      console.log(`   Settings: ${questionCount} questions, ${difficulty} difficulty, language: ${effectiveLanguage}`);

      let quizData;

      if (quizType === 'practice') {
        quizData = await quizGenerationService.generatePracticeQuiz(
          note.content,
          note.title
        );
      } else if (quizType === 'comprehensive') {
        quizData = await quizGenerationService.generateComprehensiveQuiz(
          note.content,
          note.title
        );
      } else {
        quizData = await quizGenerationService.generateQuiz(
          note.content,
          note.title,
          {
            questionCount,
            difficulty,
            questionTypes,
            targetLanguage: effectiveLanguage,
          }
        );
      }

      console.log(`✅ Quiz generated successfully:`);
      console.log(`   Title: ${quizData.title}`);
      console.log(`   Questions: ${quizData.questions.length}`);
      console.log(`   First question: ${quizData.questions[0]?.questionText?.substring(0, 60)}...`);

      // Validate quiz data
      if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        throw new Error('Quiz generation returned no questions');
      }

      // Create quiz in database with STRING ARRAYS (don't transform yet!)
      const quiz = await Quiz.create({
        userId,  // ✅ Use consistent _id
        noteId: note._id,
        title: quizData.title,
        questions: quizData.questions, // Save as-is with string array options
        totalQuestions: quizData.questions.length,
      });
      incrementQuota(userId.toString(), 'quizzes');

      // Transform for response ONLY (don't save this to DB)
      const transformedQuiz = {
        ...quiz.toObject(),
        questions: quiz.questions.map((question: any, qIndex: number) => ({
          id: `question-${qIndex}`,
          question: question.questionText,
          questionText: question.questionText, // Keep both for compatibility
          questionType: question.questionType,
          options: question.options.map((optionText: string, index: number) => ({
            id: `option-${index}`,
            text: optionText,
          })),
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
        })),
      };

      return res.status(201).json({
        success: true,
        message: 'Quiz generated successfully',
        data: transformedQuiz,
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error generating quiz:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate quiz',
        error: error.message,
      });
    }
  }

  /**
   * Generate quiz directly from raw text (e.g. a chat answer) — no saved Note required.
   * POST /api/v1/quizzes/generate-from-text
   */
  async generateQuizFromText(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const {
        content,
        title = 'Quiz',
        questionCount = 10,
        difficulty = 'medium',
        questionTypes = ['multiple-choice'],
        targetLanguage,
        chatSessionId,
      } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'content is required',
        });
      }

      const userId = req.user._id;

      try {
        checkQuota(req.user, 'quizzes');
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          return res.status(402).json({ success: false, quotaExceeded: true, feature: e.feature, message: e.message });
        }
        throw e;
      }

      const effectiveLanguage = targetLanguage || req.user.studyLanguage || req.user.preferredLanguage || 'en';

      console.log(`🎯 Generating quiz from raw text (title: "${title}")`);

      const quizData = await quizGenerationService.generateQuiz(content, title, {
        questionCount,
        difficulty,
        questionTypes,
        targetLanguage: effectiveLanguage,
      });

      if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        throw new Error('Quiz generation returned no questions');
      }

      const quiz = await Quiz.create({
        userId,
        title: quizData.title,
        questions: quizData.questions,
        totalQuestions: quizData.questions.length,
        chatSessionId: chatSessionId || undefined,
      });
      incrementQuota(userId.toString(), 'quizzes');

      const transformedQuiz = {
        ...quiz.toObject(),
        questions: quiz.questions.map((question: any, qIndex: number) => ({
          id: `question-${qIndex}`,
          question: question.questionText,
          questionText: question.questionText,
          questionType: question.questionType,
          options: question.options.map((optionText: string, index: number) => ({
            id: `option-${index}`,
            text: optionText,
          })),
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
        })),
      };

      return res.status(201).json({
        success: true,
        message: 'Quiz generated successfully',
        data: transformedQuiz,
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error generating quiz from text:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate quiz',
        error: error.message,
      });
    }
  }

  /**
   * Get all user quizzes
   * GET /api/v1/quizzes
   */
  async getQuizzes(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // ✅ Validate pagination
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [quizzes, total] = await Promise.all([
        Quiz.find({ userId: req.user._id })  // ✅ Use _id
          .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limitNum)
          .populate('noteId', 'title')
          .lean(),
        Quiz.countDocuments({ userId: req.user._id }),
      ]);

      // Transform questions to ensure options have id and text format
      const transformedQuizzes = quizzes.map((quiz: any) => ({
        ...quiz,
        questions: quiz.questions.map((question: any) => ({
          ...question,
          options: Array.isArray(question.options) && typeof question.options[0] === 'string'
            ? question.options.map((optionText: string, index: number) => ({
                id: `option-${index}`,
                text: optionText,
              }))
            : question.options, // Already in correct format
        })),
      }));

      return res.json({
        success: true,
        data: transformedQuizzes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error fetching quizzes:`, error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }

  /**
   * Get quizzes for a specific note
   * GET /api/v1/quizzes/note/:noteId
   */
  async getQuizzesByNote(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      if (!req.params.noteId) {
        return res.status(400).json({
          success: false,
          message: 'Note ID is required',
        });
      }

      const quizzes = await Quiz.find({
        userId: req.user._id,  // ✅ Use _id
        noteId: req.params.noteId,
      })
        .sort({ createdAt: -1 })
        .lean();

      // Transform questions to ensure options have id and text format
      const transformedQuizzes = quizzes.map((quiz: any) => ({
        ...quiz,
        questions: quiz.questions.map((question: any) => ({
          ...question,
          options: Array.isArray(question.options) && typeof question.options[0] === 'string'
            ? question.options.map((optionText: string, index: number) => ({
                id: `option-${index}`,
                text: optionText,
              }))
            : question.options, // Already in correct format
        })),
      }));

      return res.json({
        success: true,
        data: transformedQuizzes,
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error fetching quizzes:`, error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }

  /**
   * Get quizzes grouped by their originating note/chat, one row per source — so retaking a
   * quiz doesn't create a separate top-level history entry every time.
   * GET /api/v1/quizzes/groups
   */
  async getQuizGroups(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const quizzes = await Quiz.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .select('title noteId chatSessionId totalQuestions correctAnswers userAnswers createdAt')
        .lean();

      interface GroupAcc {
        groupKey: string;
        sourceType: 'note' | 'chat' | 'standalone';
        noteId?: string;
        chatSessionId?: string;
        quizId?: string;
        title: string;
        createdAt: Date;
        totalQuestions: number;
        lastScore?: { correct: number; total: number };
        bestScore?: { correct: number; total: number };
        attempts: number;
      }

      const groups = new Map<string, GroupAcc>();

      // Quizzes are sorted desc by createdAt, so the first one seen per group key is the most
      // recent attempt — used for the row's headline title/date/question count.
      for (const quiz of quizzes as any[]) {
        const key = quiz.noteId
          ? `note:${quiz.noteId}`
          : quiz.chatSessionId
          ? `chat:${quiz.chatSessionId}`
          : `standalone:${quiz._id}`;

        const attempted = Array.isArray(quiz.userAnswers) && quiz.userAnswers.length > 0;
        const existing = groups.get(key);

        if (!existing) {
          groups.set(key, {
            groupKey: key,
            sourceType: quiz.noteId ? 'note' : quiz.chatSessionId ? 'chat' : 'standalone',
            noteId: quiz.noteId?.toString(),
            chatSessionId: quiz.chatSessionId?.toString(),
            quizId: !quiz.noteId && !quiz.chatSessionId ? quiz._id.toString() : undefined,
            title: quiz.title,
            createdAt: quiz.createdAt,
            totalQuestions: quiz.totalQuestions,
            lastScore: attempted ? { correct: quiz.correctAnswers, total: quiz.totalQuestions } : undefined,
            bestScore: attempted ? { correct: quiz.correctAnswers, total: quiz.totalQuestions } : undefined,
            attempts: 1,
          });
        } else {
          existing.attempts += 1;
          if (attempted) {
            if (!existing.lastScore) {
              existing.lastScore = { correct: quiz.correctAnswers, total: quiz.totalQuestions };
            }
            const pct = quiz.correctAnswers / quiz.totalQuestions;
            const bestPct = existing.bestScore ? existing.bestScore.correct / existing.bestScore.total : -1;
            if (pct > bestPct) {
              existing.bestScore = { correct: quiz.correctAnswers, total: quiz.totalQuestions };
            }
          }
        }
      }

      const groupList = Array.from(groups.values());

      // Resolve source titles (note titles / chat session titles) to show on the row instead
      // of the raw generated quiz title, which can be a generic auto-generated string.
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
      console.error(`[${req.correlationId}] Error fetching quiz groups:`, error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Get every quiz attempt under a single note or chat session, plus the source's own
   * title/date and aggregate stats — powers the "all quizzes under this chat/note" detail screen.
   * GET /api/v1/quizzes/group?noteId=X or ?chatSessionId=Y
   */
  async getQuizGroupDetail(req: AuthRequest, res: Response) {
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

      const quizzes = await Quiz.find(filter)
        .sort({ createdAt: 1 })
        .select('title totalQuestions correctAnswers userAnswers createdAt')
        .lean();

      if (quizzes.length === 0) {
        return res.status(404).json({ success: false, message: 'No quizzes found for this source' });
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

      const attempted = quizzes.filter((q: any) => Array.isArray(q.userAnswers) && q.userAnswers.length > 0);
      const lastAttempt = attempted[attempted.length - 1] as any;
      const bestAttempt = attempted.reduce((best: any, q: any) => {
        if (!best) return q;
        return q.correctAnswers / q.totalQuestions > best.correctAnswers / best.totalQuestions ? q : best;
      }, null as any);
      const latestQuiz = quizzes[quizzes.length - 1] as any;

      return res.json({
        success: true,
        data: {
          source,
          attempts: quizzes.map((q: any, index: number) => ({
            quizId: q._id.toString(),
            label: `Quiz ${index + 1}`,
            title: q.title,
            totalQuestions: q.totalQuestions,
            createdAt: q.createdAt,
            isCompleted: Array.isArray(q.userAnswers) && q.userAnswers.length > 0,
            correctAnswers: q.correctAnswers,
          })),
          lastScore: lastAttempt ? { correct: lastAttempt.correctAnswers, total: lastAttempt.totalQuestions } : null,
          bestScore: bestAttempt ? { correct: bestAttempt.correctAnswers, total: bestAttempt.totalQuestions } : null,
          attemptCount: quizzes.length,
          latestQuizId: latestQuiz._id.toString(),
          latestQuestionCount: latestQuiz.totalQuestions,
        },
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error fetching quiz group detail:`, error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Get single quiz
   * GET /api/v1/quizzes/:id
   */
  async getQuizById(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const quiz = await Quiz.findOne({
        _id: req.params.id,
        userId: req.user._id,  // ✅ Use _id
      }).populate('noteId', 'title');

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found',
        });
      }

      // Transform questions for frontend format
      const transformedQuiz = quiz.toObject();
      transformedQuiz.questions = transformedQuiz.questions.map((question: any, qIndex: number) => {
        // Ensure options are in {id, text} format
        const formattedOptions = Array.isArray(question.options)
          ? question.options.map((opt: any, index: number) => {
              if (typeof opt === 'string') {
                return { id: `option-${index}`, text: opt };
              }
              return opt; // Already in correct format
            })
          : [];

        return {
          id: `question-${qIndex}`,
          question: question.questionText,
          questionText: question.questionText,
          questionType: question.questionType,
          options: formattedOptions,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
        };
      });

      return res.json({
        success: true,
        data: transformedQuiz,
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error fetching quiz:`, error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }

  /**
   * Submit quiz answers
   * POST /api/v1/quizzes/:id/submit
   */
  async submitQuiz(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { answers } = req.body;

      // Validation
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          message: 'Answers array is required',
        });
      }

      const quiz = await Quiz.findOne({
        _id: req.params.id,
        userId: req.user._id,  // ✅ Use _id
      });

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found',
        });
      }

      // Grade quiz
      let correctCount = 0;
      const results = quiz.questions.map((question, index) => {
        const userAnswer = answers[index];
        const isCorrect =
          userAnswer !== undefined &&
          userAnswer.toString() === question.correctAnswer.toString();

        if (isCorrect) correctCount++;

        return {
          questionIndex: index,
          questionText: question.questionText,
          userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation,
        };
      });

      const score = Math.round((correctCount / quiz.totalQuestions) * 100);

      quiz.userAnswers = answers;
      quiz.correctAnswers = correctCount;

      await quiz.save();

      return res.json({
        success: true,
        data: {
          score,
          correctCount,
          totalQuestions: quiz.totalQuestions,
          percentage: score,
          results,
        },
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error submitting quiz:`, error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }

  /**
   * Delete quiz
   * DELETE /api/v1/quizzes/:id
   */
  async deleteQuiz(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const quiz = await Quiz.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id,  // ✅ Use _id
      });

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found',
        });
      }

      return res.json({
        success: true,
        message: 'Quiz deleted successfully',
      });
    } catch (error: any) {
      console.error(`[${req.correlationId}] Error deleting quiz:`, error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }

  /**
   * Export quiz questions
   * GET /api/v1/quizzes/:quizId/export/questions?format=pdf|txt
   */
  async exportQuestions(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { quizId } = req.params;
      const { format = 'pdf' } = req.query;

      // Validate format
      if (!['pdf', 'txt', 'docx'].includes(format as string)) {
        return res.status(400).json({ success: false, message: 'Invalid format. Use pdf, txt, or docx' });
      }

      // Get quiz
      const quiz = await Quiz.findOne({
        _id: quizId,
        userId: req.user._id,
      });

      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
      }

      let content: Buffer | string;
      let filename: string;

      if (format === 'docx') {
        const quizExportDOCXService = (await import('../services/quizExportDOCX.service')).default;
        content = await quizExportDOCXService.exportQuestionsToDOCX(quiz);
        filename = quizExportDOCXService.getExportFilename(quiz.title, false, 'docx');
      } else {
        const quizExportService = (await import('../services/quizExport.service')).default;
        content = await quizExportService.exportQuestions(quiz, format as 'pdf' | 'txt');
        filename = quizExportService.getExportFilename(quiz.title, false, format as 'pdf' | 'txt');
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
      console.error(`[${req.correlationId}] Error exporting quiz questions:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export quiz questions',
        error: error.message,
      });
    }
  }

  /**
   * Export quiz answers & explanations
   * GET /api/v1/quizzes/:quizId/export/answers?format=pdf|txt|docx
   */
  async exportAnswers(req: AuthRequest, res: Response) {
    try {
      if (!req.user?._id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { quizId } = req.params;
      const { format = 'pdf' } = req.query;

      // Validate format
      if (!['pdf', 'txt', 'docx'].includes(format as string)) {
        return res.status(400).json({ success: false, message: 'Invalid format. Use pdf, txt, or docx' });
      }

      // Get quiz
      const quiz = await Quiz.findOne({
        _id: quizId,
        userId: req.user._id,
      });

      if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
      }

      let content: Buffer | string;
      let filename: string;

      if (format === 'docx') {
        const quizExportDOCXService = (await import('../services/quizExportDOCX.service')).default;
        content = await quizExportDOCXService.exportAnswersToDOCX(quiz);
        filename = quizExportDOCXService.getExportFilename(quiz.title, true, 'docx');
      } else {
        const quizExportService = (await import('../services/quizExport.service')).default;
        content = await quizExportService.exportAnswers(quiz, format as 'pdf' | 'txt');
        filename = quizExportService.getExportFilename(quiz.title, true, format as 'pdf' | 'txt');
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
      console.error(`[${req.correlationId}] Error exporting quiz answers:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export quiz answers',
        error: error.message,
      });
    }
  }

}

export default new QuizController();
