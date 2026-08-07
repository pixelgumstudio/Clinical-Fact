import { Router } from 'express';
import flashcardController from '../controllers/flashcard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Generate flashcards from note
router.post('/generate', authenticate, flashcardController.generateFlashcards);
router.post('/', authenticate, flashcardController.generateFlashcards);

// Generate flashcards directly from raw text (e.g. a chat answer) — no saved Note required
router.post('/generate-from-text', authenticate, flashcardController.generateFlashcardsFromText);

// List flashcard sets
router.get('/', authenticate, flashcardController.listFlashcardSets);

// Get flashcard sets grouped by originating note/chat — one row per source instead of one
// per generation
router.get('/groups', authenticate, flashcardController.getFlashcardGroups);

// Get every flashcard set under a single note or chat session (?noteId= or ?chatSessionId=)
router.get('/group', authenticate, flashcardController.getFlashcardGroupDetail);

// Get flashcard set
router.get('/:setId', authenticate, flashcardController.getFlashcardSet);

// Update flashcard
router.put('/:setId/cards/:cardId', authenticate, flashcardController.updateFlashcard);

// Review flashcard
router.post('/:setId/cards/:cardId/review', authenticate, flashcardController.reviewFlashcard);

// Get flashcard set statistics
router.get('/:setId/statistics', authenticate, flashcardController.getStatistics);

// Export flashcard questions
router.get('/:setId/export/questions', authenticate, flashcardController.exportQuestions.bind(flashcardController));

// Export flashcard answers
router.get('/:setId/export/answers', authenticate, flashcardController.exportAnswers.bind(flashcardController));

// Delete flashcard set
router.delete('/:setId', authenticate, flashcardController.deleteFlashcardSet);

export default router;
