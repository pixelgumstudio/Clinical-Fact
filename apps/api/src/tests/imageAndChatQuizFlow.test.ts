import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { generateAccessToken } from '../utils/jwt';

const { MongoMemoryServer } = require('mongodb-memory-server');

// Deterministic AI so the test exercises our routes, jobs and persistence — not OpenAI.
// Mocked by file path (.ts): the generation services import './ai.service', which jest.config's
// moduleNameMapper for '../services/ai.service' does not intercept. Plain functions, not
// jest.fn(), because resetMocks: true would wipe jest.fn implementations.
jest.mock('../services/ai.service.ts', () => ({
  __esModule: true,
  default: {
    generateJSON: async (prompt: string) =>
      /quiz/i.test(prompt)
        ? {
            title: 'Generated Quiz',
            questions: [
              {
                questionText: 'Which drug class lowers heart rate?',
                questionType: 'multiple-choice',
                options: ['Beta blockers', 'Loop diuretics', 'Statins', 'Antacids'],
                correctAnswer: 0,
                explanation: 'Beta blockers block B1 receptors.',
                difficulty: 'medium',
              },
            ],
          }
        : { title: 'Generated Note', content: '<p>Beta blockers lower heart rate.</p>', summary: 'Summary' },
    generateText: async () => 'text',
  },
}));

const OCR_TEXT = `Pharmacology  Beta blockers
Mechanism: block B1/B2 receptors -> decreased HR, decreased contractility
Uses: HTN, angina, post-MI, HF (carvedilol, metoprolol, bisoprolol)
Adverse: bradycardia, bronchospasm (non-selective), masking hypoglycemia`;

const CHAT_TRANSCRIPT = [
  'Q: What is the first-line treatment for community-acquired pneumonia in a healthy adult?',
  'A: Amoxicillin 1 g three times daily, or doxycycline 100 mg twice daily, for about 5 days.',
].join('\n\n');

const waitForJob = async (jobId: string) => {
  for (let i = 0; i < 50; i++) {
    const job: any = await Job.findOne({ jobId }).lean();
    if (job && (job.status === 'completed' || job.status === 'failed')) return job;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Job ${jobId} did not finish`);
};

describe('Image → note → quiz and chat → quiz flows', () => {
  let mongod: any;
  let token: string; // PRO user — unaffected by free-tier limits
  let freeToken: string;

  const createUser = async (suffix: string, subscription: 'FREE' | 'PRO') => {
    const user = await User.create({
      email: `flow_${suffix}_${Date.now()}@test.com`,
      name: 'Flow User',
      username: `flow_${suffix}_${Date.now()}`,
      authProvider: 'local',
      subscription,
    });
    return generateAccessToken({ userId: user._id.toString(), email: user.email, username: user.username });
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'test' });
    token = await createUser('pro', 'PRO');
    freeToken = await createUser('free', 'FREE');
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it('turns OCR text from an image into a note via a job, then a quiz from that note', async () => {
    const generate = await request(app)
      .post('/api/v1/notes/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: OCR_TEXT, sourceType: 'image', title: 'IMG_2031.jpg' });

    expect(generate.status).toBe(202);
    const jobId = generate.body.data.jobId;
    expect(jobId).toBeTruthy();

    const job = await waitForJob(jobId);
    expect(job.error).toBeFalsy();
    expect(job.status).toBe('completed');
    const noteId = job.result?.noteId ?? job.result?._id;
    expect(noteId).toBeTruthy();

    const quiz = await request(app)
      .post('/api/v1/quizzes/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ noteId, questionCount: 3 });

    expect(quiz.status).toBe(201);
    expect(quiz.body.data.questions.length).toBeGreaterThan(0);
  });

  it('generates a quiz from a chat transcript and lists it under that chat session', async () => {
    const chatSessionId = new mongoose.Types.ObjectId().toString();

    const quiz = await request(app)
      .post('/api/v1/quizzes/generate-from-text')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: CHAT_TRANSCRIPT, title: 'Pneumonia chat', questionCount: 3, chatSessionId });

    expect(quiz.status).toBe(201);
    expect(quiz.body.data.questions.length).toBeGreaterThan(0);

    const group = await request(app)
      .get(`/api/v1/quizzes/group?chatSessionId=${chatSessionId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(group.status).toBe(200);
    expect(group.body.data.attempts).toHaveLength(1);
  });

  it('refuses a chat transcript that is too short with a clear message', async () => {
    const quiz = await request(app)
      .post('/api/v1/quizzes/generate-from-text')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Q: hi\n\nA: hello', title: 'Short chat' });

    expect(quiz.status).toBe(400);
    expect(quiz.body.code).toBe('CONTENT_TOO_SHORT');
  });

  it('lets a FREE user generate one quiz, then answers the next with 402 quotaExceeded (the app turns that into the paywall)', async () => {
    const generate = () =>
      request(app)
        .post('/api/v1/quizzes/generate-from-text')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({ content: CHAT_TRANSCRIPT, title: 'Pneumonia chat', questionCount: 3 });

    const first = await generate();
    expect(first.status).toBe(201);

    // incrementQuota runs fire-and-forget after the response, so give it a moment
    await new Promise((resolve) => setTimeout(resolve, 300));

    const second = await generate();
    expect(second.status).toBe(402);
    expect(second.body.quotaExceeded).toBe(true);
  });
});
