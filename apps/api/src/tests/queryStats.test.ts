import mongoose from 'mongoose';
import ChatSession from '../models/ChatSession';
import { countQueriesByUser, getUserQueryStats, getQueryAnalytics } from '../utils/queryStats';

const { MongoMemoryServer } = require('mongodb-memory-server');

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);

let mongod: any;
const userA = new mongoose.Types.ObjectId();
const userB = new mongoose.Types.ObjectId();

// Inserted through the raw collection so updatedAt reflects the last message, as it does in
// production, instead of being stamped "now" by mongoose.
function session(userId: mongoose.Types.ObjectId, sourceType: string, messages: { role: string; at: Date }[]) {
  const updatedAt = messages.reduce((latest, m) => (m.at > latest ? m.at : latest), messages[0].at);
  return ChatSession.collection.insertOne({
    userId,
    title: 'test',
    sourceType,
    attachedSources: [],
    messages: messages.map((m) => ({ role: m.role, content: 'x', timestamp: m.at })),
    createdAt: messages[0].at,
    updatedAt,
  });
}

describe('queryStats', () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'test' });

    await mongoose.connection.collection('users').insertMany([
      { _id: userA, name: 'Ada', email: 'ada@example.com', subscription: 'PRO' },
      { _id: userB, name: 'Ben', email: 'ben@example.com', subscription: 'FREE' },
    ]);

    // Ada: 3 medical queries (2 today, 1 ten days ago) + 1 note-chat query two days ago.
    await session(userA, 'medical_qa', [
      { role: 'user', at: daysAgo(10) },
      { role: 'assistant', at: daysAgo(10) },
      { role: 'user', at: new Date() },
      { role: 'assistant', at: new Date() },
      { role: 'user', at: new Date() },
      { role: 'assistant', at: new Date() },
    ]);
    await session(userA, 'note', [
      { role: 'user', at: daysAgo(2) },
      { role: 'assistant', at: daysAgo(2) },
    ]);
    // Ben: one medical query, 40 days ago (outside the 30-day window).
    await session(userB, 'medical_qa', [
      { role: 'user', at: daysAgo(40) },
      { role: 'assistant', at: daysAgo(40) },
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  it('counts only user messages per user', async () => {
    const counts = await countQueriesByUser([userA, userB, new mongoose.Types.ObjectId()]);
    expect(counts[userA.toString()]).toBe(4);
    expect(counts[userB.toString()]).toBe(1);
    expect(Object.keys(counts)).toHaveLength(2);
  });

  it('returns no counts for an empty id list', async () => {
    expect(await countQueriesByUser([])).toEqual({});
  });

  it('breaks down one user by type and recency', async () => {
    const stats = await getUserQueryStats(userA);
    expect(stats).toMatchObject({ total: 4, medical: 3, noteChat: 1, last7Days: 3, last30Days: 4 });
    expect(stats.lastQueryAt).toBeInstanceOf(Date);
  });

  it('returns zeros and a null last query for a user with no chats', async () => {
    const stats = await getUserQueryStats(new mongoose.Types.ObjectId());
    expect(stats).toEqual({ total: 0, medical: 0, noteChat: 0, last7Days: 0, last30Days: 0, lastQueryAt: null });
  });

  it('aggregates platform analytics over the window', async () => {
    const data = await getQueryAnalytics(30);

    expect(data.summary).toEqual({ total: 5, medical: 4, noteChat: 1, today: 2, last7Days: 3, last30Days: 4 });
    expect(data.range).toEqual({ total: 4, activeUsers: 1, avgPerActiveUser: 4 });

    expect(data.daily).toHaveLength(30);
    expect(data.daily.reduce((sum, d) => sum + d.count, 0)).toBe(4);
    expect(data.daily[data.daily.length - 1].count).toBe(2);

    expect(data.topUsers).toEqual([
      { _id: userA.toString(), name: 'Ada', email: 'ada@example.com', subscription: 'PRO', total: 4, medical: 3, noteChat: 1 },
    ]);
  });

  it('widens the window to include older users', async () => {
    const data = await getQueryAnalytics(90);
    expect(data.range).toMatchObject({ total: 5, activeUsers: 2 });
    expect(data.topUsers.map((u) => u.name)).toEqual(['Ada', 'Ben']);
  });
});
