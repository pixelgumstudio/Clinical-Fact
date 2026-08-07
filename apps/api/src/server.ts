// Load environment variables FIRST before any other imports
import webhookRoutes from './routes/webhook.routes';
import referralRoutes from './routes/referral.routes';
import userRoutes from './routes/user.routes';
import dotenv from 'dotenv';
dotenv.config();

// Validate environment variables before anything else
import { validateEnv } from './config/env';
validateEnv();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { globalLimiter, authLimiter, aiGenerationLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth.routes';
import otpRoutes from './routes/otp.routes';
import noteRoutes from './routes/note.routes';
import uploadRoutes from './routes/upload.routes';
import flashcardRoutes from './routes/flashcard.routes';
import quizRoutes from './routes/quiz.routes';
import chatRoutes from './routes/chat.routes';
import folderRoutes from './routes/folder.routes';
import youtubeRoutes from './routes/youtube.routes';
import adminRoutes from './routes/admin.routes';
import jobRoutes from './routes/job.routes';
import feedbackRoutes from './routes/feedback.routes';
import vectorDbService from './services/vectorDb.service';
import { startYouTubeKeepAlive } from './worker/youtube-keepalive.worker';
import {
  requestLogger,
  errorLogger,
  notFoundHandler,
  multerErrorHandler,
} from './middleware/errorLogger';


const app: Application = express();
// '1' trusts exactly one reverse-proxy hop (the Nginx/Traefik container that
// terminates SSL before reaching this Node process on Hetzner).
// Increase to 2 if you add a cloud load balancer (e.g. Hetzner LB or Cloudflare
// proxy) in front of the Nginx layer — each additional hop increments this by 1.
// Getting this wrong makes req.ip resolve to the Docker bridge (172.x.x.x),
// which means ALL users share one rate-limit bucket and a single busy user can
// ban the entire server. Verify with: console.log(req.ip) in a request handler
// and confirm it shows the real client IP (e.g. 203.0.113.5), not 172.x.x.x.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
// ── Webhooks (before global rate limiters and body parsers)
app.use('/webhooks', webhookRoutes);

// Configure CORS with security in mind
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://192.168.0.173:8081',
  'exp://192.168.0.173:8081',
  'http://localhost:19000',
  'http://localhost:19006',
];
app.use(cors({
  origin: true,
  // origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Add correlation ID middleware
app.use((req: any, res, next) => {
  req.correlationId = req.get('X-Correlation-ID') || uuidv4();
  res.set('X-Correlation-ID', req.correlationId);
  next();
});

// Request logging middleware
app.use(requestLogger);

// Health check endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'Clinical Fact API',
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Clinical Fact API',
    version: '1.0.0',
    docs: '/api/v1/docs',
  });
});

// API v1 root
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    message: 'Clinical Fact API v1',
    version: '1.0.0',
    docs: '/api/v1/docs',
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

// Global floor — every /api/v1/* route passes through this first.
app.use('/api/v1', globalLimiter);

// ── Auth limiter: credential-submission routes only ───────────────────────────
// Applied to the specific POST paths that accept credentials or OTP tokens.
// GET/PUT/DELETE routes on the same routers (e.g. /me, /profile) are NOT
// throttled here — they are covered by the global limiter above.
app.post('/api/v1/auth/login', authLimiter);
app.post('/api/v1/auth/register', authLimiter);
app.post('/api/v1/otp/send', authLimiter);
app.post('/api/v1/otp/send/signup', authLimiter);
app.post('/api/v1/otp/send/login', authLimiter);
app.post('/api/v1/otp/send-signup', authLimiter);
app.post('/api/v1/otp/send-login', authLimiter);
app.post('/api/v1/otp/verify/signup', authLimiter);
app.post('/api/v1/otp/verify/login', authLimiter);
app.post('/api/v1/otp/resend', authLimiter);

// ── AI generation limiter: every LLM / transcription / OCR endpoint ──────────
// Registered before the router mounts so the limiter fires in the middleware
// chain before the controller is reached.
app.post('/api/v1/notes/generate', aiGenerationLimiter);
app.put('/api/v1/notes/:noteId/enhance', aiGenerationLimiter);
app.put('/api/v1/notes/:noteId/translate', aiGenerationLimiter);
app.put('/api/v1/notes/:noteId/retranscribe', aiGenerationLimiter);
app.post('/api/v1/chat', aiGenerationLimiter);                        // create session (LLM)
app.post('/api/v1/chat/create-from-note', aiGenerationLimiter);       // create session (LLM)
app.post('/api/v1/chat/create-from-document', aiGenerationLimiter);   // create session (LLM)
app.post('/api/v1/chat/:sessionId/message', aiGenerationLimiter);     // send message (LLM)
app.post('/api/v1/flashcards/generate', aiGenerationLimiter);
app.post('/api/v1/flashcards', aiGenerationLimiter);    // alias route
app.post('/api/v1/quizzes/generate', aiGenerationLimiter);
app.post('/api/v1/quizzes', aiGenerationLimiter);       // alias route
app.post('/api/v1/upload/image-ocr', aiGenerationLimiter);
app.post('/api/v1/upload/audio-transcribe', aiGenerationLimiter);
app.post('/api/v1/upload/pdf-extract', aiGenerationLimiter);
app.post('/api/v1/upload/youtube-transcript', aiGenerationLimiter);
app.post('/api/v1/youtube/generate-note', aiGenerationLimiter);

// ── Route mounts ──────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/notes', noteRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/flashcards', flashcardRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/folders', folderRoutes);
app.use('/api/v1/youtube', youtubeRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/internal-feedback', feedbackRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler); // 404 handler
app.use(multerErrorHandler); // Handle file upload errors
app.use(errorLogger); // Comprehensive error logging and response

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    } as any);
    console.log('📦 MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.error('❌ Cannot start server without database connection');
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  // Start transcription worker AFTER MongoDB is connected so Note.findById() works
  require('./worker/transcription.worker');
  console.log('⚙️  Transcription worker started (concurrency: 2)');

  // Start YouTube session keep-alive worker and schedule the repeatable job
  await startYouTubeKeepAlive();
  console.log('⚙️  YouTube keep-alive worker started (runs every 3 days)');

  // Wait for vector DB initialization
  try {
    await vectorDbService.waitForInitialization();
  } catch (error) {
    console.error('⚠️ Vector DB initialization failed, continuing without it:', error);
  }

  const server = app.listen(parseInt(PORT as string, 10), '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌐 Network: http://192.168.0.173:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
  });

  // Handle server errors
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });
};

// Only start the server when this file is run directly (not when imported by tests)
if (require.main === module) {
  startServer().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

  // Prevent the process from exiting when run directly
  process.on('SIGINT', () => {
    console.log('\n⚠️ Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });
}

export { app, startServer };
