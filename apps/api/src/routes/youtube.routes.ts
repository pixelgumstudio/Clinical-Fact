// apps/api/src/routes/youtube.routes.ts
import express from 'express';
import {
  getVideoInfo,
  getTranscript,
  checkTranscript,
  generateNoteFromYouTube,
  getNoteStatus,
  getFullVideoData,
  // testVideoUrl,
} from '../controllers/youtube.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/v1/youtube/info
 * @desc    Get YouTube video information
 * @access  Public
 */
router.post('/info', getVideoInfo);

/**
 * @route   POST /api/v1/youtube/transcript
 * @desc    Get YouTube video transcript
 * @access  Public
 */
router.post('/transcript', getTranscript);

/**
 * @route   POST /api/v1/youtube/check-transcript
 * @desc    Check if video has transcript available
 * @access  Public
 */
router.post('/check-transcript', checkTranscript);

/**
 * @route   POST /api/v1/youtube/full-data
 * @desc    Get full video data (info + transcript)
 * @access  Public
 */
router.post('/full-data', getFullVideoData);

/**
 * @route   POST /api/v1/youtube/test-url
 * @desc    Test and validate YouTube URL (debug endpoint)
 * @access  Public
 */
// router.post('/test-url', testVideoUrl);

/**
 * @route   POST /api/v1/youtube/generate-note
 * @desc    Generate note from YouTube video
 * @access  Private (requires authentication)
 */
router.post('/generate-note', authenticate, generateNoteFromYouTube);

/**
 * @route   GET /api/v1/youtube/note-status/:noteId
 * @desc    Get the status of a generated note
 * @access  Private (requires authentication)
 */
router.get('/note-status/:noteId', authenticate, getNoteStatus);

export default router;