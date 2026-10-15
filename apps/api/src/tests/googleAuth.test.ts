import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server';
import { User } from '../models/User';
import { googleOAuthClient } from '../config/google';

const { MongoMemoryServer } = require('mongodb-memory-server');

describe('POST /api/v1/auth/google (ID token)', () => {
  let mongod: any;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'test' });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    await User.deleteMany({});
  });

  it('accepts a valid token and checks it against every configured client ID', async () => {
    process.env.GOOGLE_CLIENT_ID = 'web-client';
    process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client';
    const verify = jest.spyOn(googleOAuthClient as any, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({ sub: 'g-123', email: 'doc@example.com', name: 'Doc Tor' }),
    } as any);

    const response = await request(app).post('/api/v1/auth/google').send({ idToken: 'token' });

    // First sign-in creates the user, so the endpoint answers 201.
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(verify).toHaveBeenCalledWith({
      idToken: 'token',
      audience: ['web-client', 'android-client'],
    });
  });

  it('reports a client ID mismatch as a 401 that names the cause', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .spyOn(googleOAuthClient as any, 'verifyIdToken')
      .mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAudience'));

    const response = await request(app).post('/api/v1/auth/google').send({ idToken: 'token' });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/client ID mismatch/i);
  });

  it('reports any other verification failure as an invalid token, not a 500', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(googleOAuthClient as any, 'verifyIdToken').mockRejectedValue(new Error('Token used too late'));

    const response = await request(app).post('/api/v1/auth/google').send({ idToken: 'token' });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid or expired/i);
  });
});
