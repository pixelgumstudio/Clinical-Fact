import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { runKeepAlive } from '../services/youtube-cookie.service';

const QUEUE_NAME = 'youtubeKeepAlive';
const SCHEDULER_ID = 'youtube-keep-alive-3d';
const EVERY_3_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 259_200_000 ms

const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  family: 4,
});

connection.on('connect', () => console.log('✅ [YouTube Keep-Alive] Redis connected.'));
connection.on('error', (err) =>
  console.error('❌ [YouTube Keep-Alive] Redis error:', err.message)
);

const keepAliveQueue = new Queue(QUEUE_NAME, { connection });

const keepAliveWorker = new Worker(
  QUEUE_NAME,
  async () => {
    console.log('🔄 [YouTube Keep-Alive] Running scheduled keep-alive…');
    await runKeepAlive();
  },
  { connection, concurrency: 1 }
);

keepAliveWorker.on('completed', () =>
  console.log('✅ [YouTube Keep-Alive] Job completed.')
);
keepAliveWorker.on('failed', (_job, err) =>
  console.error(`❌ [YouTube Keep-Alive] Job failed: ${err.message}`)
);

/**
 * Registers (or updates) the repeatable keep-alive job.
 * upsertJobScheduler is idempotent — safe to call on every server restart.
 */
export async function startYouTubeKeepAlive(): Promise<void> {
  await keepAliveQueue.upsertJobScheduler(
    SCHEDULER_ID,
    { every: EVERY_3_DAYS_MS },
    { name: 'ping', data: {} }
  );
  console.log('📅 [YouTube Keep-Alive] Repeatable job scheduled (every 3 days).');
}
