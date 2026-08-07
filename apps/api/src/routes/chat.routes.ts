import { Router } from 'express';
import chatController from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Create standalone medical Q&A chat session (no note/document required)
router.post('/medical', authenticate, chatController.createMedicalChatSession);

// Create chat session from note
router.post('/create-from-note', authenticate, chatController.createChatSessionFromNote);
router.post('/', authenticate, chatController.createChatSessionFromNote);

// Create chat session from document file
router.post('/create-from-document', authenticate, chatController.createChatSessionFromDocument);

// List chat sessions
router.get('/', authenticate, chatController.listChatSessions);

// Get chat session
router.get('/:sessionId', authenticate, chatController.getChatSession);

// Attach an additional note/file to an existing session (embeds into the same session)
router.post('/:sessionId/attach', authenticate, chatController.attachSourceToSession);

// Send message in chat session
router.post('/:sessionId/message', authenticate, chatController.sendMessage);

// Move chat session to folder
router.put('/:sessionId/move-to-folder', authenticate, chatController.moveChatToFolder);

// Get chat session statistics
router.get('/:sessionId/statistics', authenticate, chatController.getStatistics);

// Update chat session (rename)
router.put('/:sessionId', authenticate, chatController.updateChatSession);

// Delete chat session
router.delete('/:sessionId', authenticate, chatController.deleteChatSession);

export default router;
