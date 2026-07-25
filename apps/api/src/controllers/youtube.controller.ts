import { Request, Response } from 'express';
import youtubeService from '../services/youtube.service';
import noteGenerationService from '../services/noteGeneration.service';
import { extractSubtitlesViaYtDlp } from '../services/transcription.service';
import Note from '../models/Note';
import mongoose from 'mongoose';
import { addTranscriptionJob } from '../queue/transcription.queue';

// Helper function to extract user ID consistently
const getUserId = (req: Request): mongoose.Types.ObjectId | undefined => {
  const user = (req as any).user;
  if (user?.id || user?._id) {
    return new mongoose.Types.ObjectId(user.id || user._id);
  }
  return undefined;
};

// ... getVideoInfo, getTranscript, etc. (Previous methods remain the same) ...

/**
 * Generate note from YouTube video
 */
export const generateNoteFromYouTube = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { youtubeUrl } = req.body;
  let videoInfo: any;
  let note: any;

  try {
    if (!youtubeUrl) {
      return res.status(400).json({ success: false, message: 'YouTube URL is required' });
    }
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

    console.log('📺 Generating note from YouTube video for user:', userId.toHexString());

    // Step 1: Get video info (Synchronous)
    videoInfo = await youtubeService.getVideoInfo(youtubeUrl).catch(() => null);

    // --- Step 2: Attempt transcript (3-tier fallback) ---
    let transcriptData;
    let isNativeTranscriptAvailable = true;

    // Tier 1: youtube-transcript scraping library (fast, no external tools needed)
    try {
        transcriptData = await youtubeService.getTranscript(youtubeUrl);
        console.log('✅ Transcript obtained via youtube-transcript library');
    } catch (transcriptError: any) {
        console.warn(`⚠️ youtube-transcript failed: ${transcriptError.message}. Trying yt-dlp subtitle extraction...`);

        // Tier 2: yt-dlp subtitle download (fast, bot-bypass, no audio needed)
        try {
            const subtitleText = await extractSubtitlesViaYtDlp(youtubeUrl);
            const videoId = youtubeService.extractVideoId(youtubeUrl);
            transcriptData = {
                videoId: videoId || '',
                transcript: subtitleText,
                duration: 0,
                segments: [],
            };
            console.log('✅ Transcript obtained via yt-dlp subtitle extraction');
        } catch (subtitleError: any) {
            console.warn(`⚠️ yt-dlp subtitle extraction failed: ${subtitleError.message}. Switching to Audio Fallback.`);
            // Tier 3: yt-dlp full audio download + Whisper (slow, queued async)
            isNativeTranscriptAvailable = false;
        }
    }
    
    // Step 3: Create initial Note document
    note = new Note({
        userId: userId,
        title: videoInfo?.title || 'YouTube Video Note',
        content: '',
        summary: '',
        sourceType: 'youtube',
        sourceFileUrl: youtubeUrl,
        transcriptText: transcriptData?.transcript || '',
        // Set status based on availability
        processingStatus: isNativeTranscriptAvailable ? 'generating' : 'audio_extraction', 
        processingProgress: isNativeTranscriptAvailable ? 50 : 10,
        metadata: {
            youtubeVideoId: transcriptData?.videoId || videoInfo?.videoId,
            youtubeTitle: videoInfo?.title,
            youtubeThumbnail: videoInfo?.thumbnail,
            duration: transcriptData?.duration || (videoInfo?.duration ? youtubeService.parseDuration(videoInfo.duration) : 0),
        },
    });
    
    await note.save();
    console.log('📝 Note created with ID:', note._id);

    // --- Step 4: Execute or Queue ---
    if (isNativeTranscriptAvailable && transcriptData) {
        // Case A: Native Transcript Available (Synchronous Execution)
        const generatedNote = await noteGenerationService.generateNoteFromYouTube(
            transcriptData!.transcript, 
            videoInfo?.title || 'YouTube Video Note', 
            {}
        );
        
        note.title = generatedNote.title;
        note.summary = generatedNote.summary;
        note.content = generatedNote.content;
        note.processingStatus = 'completed';
        note.processingProgress = 100;
        await note.save();

        return res.status(201).json({ 
            success: true, 
            data: { 
                noteId: note._id.toString(), 
                title: note.title,
                summary: note.summary,
                content: note.content,
                processingStatus: note.processingStatus 
            },
            message: 'Note generated successfully'
        });
    
    } else {
        // Case B: Fallback Required (Asynchronous Execution via Queue)
        // This is where your Worker gets triggered!
        console.log(`🚀 Triggering Whisper Worker for Note ${note._id}`);
        await addTranscriptionJob(note._id.toString(), youtubeUrl);

        return res.status(202).json({
            success: true,
            data: {
                noteId: note._id.toString(),
                processingStatus: 'audio_extraction',
                message: 'Native transcript failed. Starting asynchronous audio transcription fallback.'
            },
        });
    }

  } catch (error: any) {
    console.error('❌ Error in generateNoteFromYouTube:', error);
    console.error('Stack:', error.stack);

    if (note && note.processingStatus !== 'completed') {
        note.processingStatus = 'failed';
        note.error = error.message;
        await note.save();
    }

    // Provide helpful error messages to user
    let userMessage = error.message || 'Failed to generate note';

    if (error.message?.includes('Invalid YouTube')) {
      userMessage = 'Invalid YouTube URL. Please check the URL and try again.';
    } else if (error.message?.includes('Transcript is disabled')) {
      userMessage = 'Transcripts are disabled for this video. Our system will extract audio instead (this may take longer).';
    } else if (error.message?.includes('Video unavailable')) {
      userMessage = 'This video is unavailable or has been removed. Please try a different video.';
    } else if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) {
      userMessage = 'Connection timeout. Please check your internet and try again.';
    }

    return res.status(500).json({
        success: false,
        message: userMessage,
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get the status and content of a generated note
 */
export const getNoteStatus = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const userId = getUserId(req);

    if (!noteId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const note = await Note.findOne({ _id: noteId, userId: userId });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        noteId: note._id.toString(),
        title: note.title,
        summary: note.summary,
        content: note.content,
        processingStatus: note.processingStatus, 
        processingProgress: note.processingProgress,
        error: note.error,
        createdAt: note.createdAt,
      },
    });

  } catch (error: any) {
    console.error('❌ Error in getNoteStatus:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve status' });
  }
};

export const getVideoInfo = async (req: Request, res: Response) => {
  try {
    const { youtubeUrl } = req.body;
    if (!youtubeUrl) {
      return res.status(400).json({ success: false, message: 'youtubeUrl is required' });
    }
    const data = await youtubeService.getVideoInfo(youtubeUrl);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Video not found or YouTube API key not configured' });
    }
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTranscript = async (req: Request, res: Response) => {
  try {
    const { youtubeUrl } = req.body;
    if (!youtubeUrl) {
      return res.status(400).json({ success: false, message: 'youtubeUrl is required' });
    }
    const data = await youtubeService.getTranscript(youtubeUrl);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const checkTranscript = async (req: Request, res: Response) => {
  try {
    const { youtubeUrl } = req.body;
    if (!youtubeUrl) {
      return res.status(400).json({ success: false, message: 'youtubeUrl is required' });
    }
    const videoId = youtubeService.extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
    }
    try {
      await youtubeService.getTranscript(youtubeUrl);
      return res.json({ success: true, data: { available: true, videoId } });
    } catch {
      return res.json({ success: true, data: { available: false, videoId } });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getFullVideoData = async (req: Request, res: Response) => {
  try {
    const { youtubeUrl } = req.body;
    if (!youtubeUrl) {
      return res.status(400).json({ success: false, message: 'youtubeUrl is required' });
    }
    const data = await youtubeService.getFullVideoData(youtubeUrl);
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};