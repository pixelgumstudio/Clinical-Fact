import mongoose from 'mongoose';
import ChatSession from '../models/ChatSession';

/**
 * A "query" is a user-authored message (`role: 'user'`) inside a ChatSession — either a medical
 * question (sourceType 'medical_qa') or a question asked in a note/document chat. Counts are
 * derived from stored messages rather than `User.freeUsage`, which only meters free-tier quota
 * (and counts sessions, not questions).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const isMedical = { $eq: ['$sourceType', 'medical_qa'] };
const userMessagesOnly = [{ $unwind: '$messages' }, { $match: { 'messages.role': 'user' } }];

export interface UserQueryStats {
  total: number;
  medical: number;
  noteChat: number;
  last7Days: number;
  last30Days: number;
  lastQueryAt: Date | null;
}

/** Total queries per user, for a page of users in the users list. Users with none are omitted. */
export async function countQueriesByUser(userIds: mongoose.Types.ObjectId[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};

  const rows = await ChatSession.aggregate([
    { $match: { userId: { $in: userIds } } },
    {
      $project: {
        userId: 1,
        userMessages: { $size: { $filter: { input: '$messages', as: 'm', cond: { $eq: ['$$m.role', 'user'] } } } },
      },
    },
    { $group: { _id: '$userId', total: { $sum: '$userMessages' } } },
  ]);

  return Object.fromEntries(rows.map((r) => [r._id.toString(), r.total as number]));
}

/** Full query breakdown for one user's detail page. */
export async function getUserQueryStats(userId: mongoose.Types.ObjectId): Promise<UserQueryStats> {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY_MS);
  const since30 = new Date(now - 30 * DAY_MS);

  const [row] = await ChatSession.aggregate([
    { $match: { userId } },
    ...userMessagesOnly,
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        medical: { $sum: { $cond: [isMedical, 1, 0] } },
        last7Days: { $sum: { $cond: [{ $gte: ['$messages.timestamp', since7] }, 1, 0] } },
        last30Days: { $sum: { $cond: [{ $gte: ['$messages.timestamp', since30] }, 1, 0] } },
        lastQueryAt: { $max: '$messages.timestamp' },
      },
    },
  ]);

  const total = row?.total ?? 0;
  const medical = row?.medical ?? 0;
  return {
    total,
    medical,
    noteChat: total - medical,
    last7Days: row?.last7Days ?? 0,
    last30Days: row?.last30Days ?? 0,
    lastQueryAt: row?.lastQueryAt ?? null,
  };
}

export interface QueryAnalytics {
  days: number;
  summary: { total: number; medical: number; noteChat: number; today: number; last7Days: number; last30Days: number };
  range: { total: number; activeUsers: number; avgPerActiveUser: number };
  daily: { _id: string; count: number }[];
  topUsers: {
    _id: string;
    name: string;
    email: string;
    subscription: 'FREE' | 'PRO';
    total: number;
    medical: number;
    noteChat: number;
  }[];
}

/** Platform-wide query analytics. `days` is the window for the chart, top users and active-user stats. */
export async function getQueryAnalytics(days: number): Promise<QueryAnalytics> {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const rangeStart = new Date(startOfToday.getTime() - (days - 1) * DAY_MS);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const since30 = new Date(now.getTime() - 30 * DAY_MS);

  // Messages in the window. Pre-filtering on `updatedAt` is safe: messages are only appended via
  // save(), which bumps it, so any session with an in-range message has updatedAt >= rangeStart.
  const inRange = [
    { $match: { updatedAt: { $gte: rangeStart } } },
    ...userMessagesOnly,
    { $match: { 'messages.timestamp': { $gte: rangeStart } } },
  ];

  const [[summary], dailyRows, topRows, [activeUsersRow]] = await Promise.all([
    ChatSession.aggregate([
      ...userMessagesOnly,
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          medical: { $sum: { $cond: [isMedical, 1, 0] } },
          today: { $sum: { $cond: [{ $gte: ['$messages.timestamp', startOfToday] }, 1, 0] } },
          last7Days: { $sum: { $cond: [{ $gte: ['$messages.timestamp', since7] }, 1, 0] } },
          last30Days: { $sum: { $cond: [{ $gte: ['$messages.timestamp', since30] }, 1, 0] } },
        },
      },
    ]),
    ChatSession.aggregate([
      ...inRange,
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$messages.timestamp' } }, count: { $sum: 1 } } },
    ]),
    ChatSession.aggregate([
      ...inRange,
      {
        $group: {
          _id: '$userId',
          total: { $sum: 1 },
          medical: { $sum: { $cond: [isMedical, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]),
    ChatSession.aggregate([...inRange, { $group: { _id: '$userId' } }, { $count: 'count' }]),
  ]);

  // Fill days with no queries so the chart line is continuous.
  const byDay = new Map<string, number>(dailyRows.map((r) => [r._id as string, r.count as number]));
  const daily = Array.from({ length: days }, (_, i) => {
    const day = new Date(rangeStart.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { _id: day, count: byDay.get(day) ?? 0 };
  });

  const rangeTotal = daily.reduce((sum, d) => sum + d.count, 0);
  const activeUsers: number = activeUsersRow?.count ?? 0;
  const total = summary?.total ?? 0;
  const medical = summary?.medical ?? 0;

  return {
    days,
    summary: {
      total,
      medical,
      noteChat: total - medical,
      today: summary?.today ?? 0,
      last7Days: summary?.last7Days ?? 0,
      last30Days: summary?.last30Days ?? 0,
    },
    range: {
      total: rangeTotal,
      activeUsers,
      avgPerActiveUser: activeUsers > 0 ? Math.round((rangeTotal / activeUsers) * 10) / 10 : 0,
    },
    daily,
    topUsers: topRows.map((r) => ({
      _id: r._id.toString(),
      name: r.user?.name ?? 'Deleted user',
      email: r.user?.email ?? '',
      subscription: r.user?.subscription ?? 'FREE',
      total: r.total,
      medical: r.medical,
      noteChat: r.total - r.medical,
    })),
  };
}
