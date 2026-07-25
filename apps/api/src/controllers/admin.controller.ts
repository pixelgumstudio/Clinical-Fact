import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import Note from '../models/Note';
import FlashcardSet from '../models/FlashcardSet';
import Quiz from '../models/Quiz';
import ChatSession from '../models/ChatSession';
import { Feedback } from '../models/Feedback';
import { ReferralPartner } from '../models/ReferralPartner';
import { ReferralConversion } from '../models/ReferralConversion';
import { transcriptionQueue } from '../queue/transcription.queue';
import { successResponse, errorResponse, paginatedResponse, ERROR_CODES } from '../utils/response';

// GET /admin/stats
export const getStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOf7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      proUsers,
      freeUsers,
      totalNotes,
      notesToday,
      notesThisWeek,
      notesThisMonth,
      failedNotes,
      totalFlashcardSets,
      totalQuizzes,
      totalChats,
      queueCounts,
      sourceTypeBreakdown,
      signupsLast30Days,
      notesLast30Days,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ subscription: 'PRO' }),
      User.countDocuments({ subscription: 'FREE' }),
      Note.countDocuments({ deletedAt: null }),
      Note.countDocuments({ createdAt: { $gte: startOfToday }, deletedAt: null }),
      Note.countDocuments({ createdAt: { $gte: startOf7Days }, deletedAt: null }),
      Note.countDocuments({ createdAt: { $gte: startOf30Days }, deletedAt: null }),
      Note.countDocuments({ processingStatus: 'failed' }),
      FlashcardSet.countDocuments(),
      Quiz.countDocuments(),
      ChatSession.countDocuments(),
      transcriptionQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      Note.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$sourceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: startOf30Days } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Note.aggregate([
        { $match: { createdAt: { $gte: startOf30Days }, deletedAt: null } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json(successResponse({
      users: { total: totalUsers, pro: proUsers, free: freeUsers },
      notes: {
        total: totalNotes,
        today: notesToday,
        thisWeek: notesThisWeek,
        thisMonth: notesThisMonth,
        failed: failedNotes,
      },
      content: { flashcardSets: totalFlashcardSets, quizzes: totalQuizzes, chats: totalChats },
      queue: queueCounts,
      charts: {
        sourceTypeBreakdown: sourceTypeBreakdown.map((s) => ({ type: s._id, count: s.count })),
        signupsLast30Days,
        notesLast30Days,
      },
    }));
  } catch (error: any) {
    console.error('[admin] getStats error:', error);
    res.status(500).json(errorResponse('Failed to fetch stats', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const search = req.query.search as string;
    const plan = req.query.plan as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const lastActive = req.query.lastActive as string;
    const goals = req.query.goals as string;
    const referralSource = req.query.referralSource as string;
    const reviewStyle = req.query.reviewStyle as string;
    const contentTypes = req.query.contentTypes as string;
    const frustrations = req.query.frustrations as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    if (plan === 'PRO' || plan === 'FREE') filter.subscription = plan;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (lastActive) {
      const now = new Date();
      const cutoffs: Record<string, Date> = {
        today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        '7days': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30days': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };
      if (lastActive === 'inactive') {
        filter.lastActiveAt = { $lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      } else if (cutoffs[lastActive]) {
        filter.lastActiveAt = { $gte: cutoffs[lastActive] };
      }
    }

    if (goals) filter.goals = { $in: goals.split(',').map((g) => g.trim()) };
    if (referralSource) filter.referralSource = { $regex: referralSource, $options: 'i' };
    if (reviewStyle) filter.reviewStyle = { $regex: reviewStyle, $options: 'i' };
    if (contentTypes) filter.contentTypes = { $in: contentTypes.split(',').map((c) => c.trim()) };
    if (frustrations) filter.frustrations = { $in: frustrations.split(',').map((f) => f.trim()) };

    const sortOrder: Record<string, any> = {
      createdAt: { createdAt: -1 },
      lastActive: { lastActiveAt: -1 },
      name: { name: 1 },
    };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort(sortOrder[sortBy] ?? { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const noteCounts = await Note.aggregate([
      { $match: { userId: { $in: userIds }, deletedAt: null } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const noteCountMap = Object.fromEntries(noteCounts.map((n) => [n._id.toString(), n.count]));

    const enriched = users.map((u) => ({
      ...u,
      noteCount: noteCountMap[u._id.toString()] ?? 0,
    }));

    res.json(paginatedResponse(enriched, page, limit, total));
  } catch (error: any) {
    console.error('[admin] getUsers error:', error);
    res.status(500).json(errorResponse('Failed to fetch users', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/users/:id
export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(errorResponse('Invalid user ID', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const [user, notes, flashcardSets, quizzes] = await Promise.all([
      User.findById(id).select('-password').lean(),
      Note.find({ userId: id, deletedAt: null }).select('title sourceType processingStatus createdAt').sort({ createdAt: -1 }).limit(50).lean(),
      FlashcardSet.find({ userId: id }).select('title totalCards createdAt').sort({ createdAt: -1 }).limit(20).lean(),
      Quiz.find({ userId: id }).select('title createdAt').sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    if (!user) {
      res.status(404).json(errorResponse('User not found', ERROR_CODES.NOT_FOUND));
      return;
    }

    res.json(successResponse({ user, notes, flashcardSets, quizzes }));
  } catch (error: any) {
    console.error('[admin] getUserDetail error:', error);
    res.status(500).json(errorResponse('Failed to fetch user', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/content?page=1&limit=20&status=&sourceType=
export const getContent = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const status = req.query.status as string;
    const sourceType = req.query.sourceType as string;

    const filter: Record<string, any> = { deletedAt: null };
    if (status) filter.processingStatus = status;
    if (sourceType) filter.sourceType = sourceType;

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .select('title sourceType processingStatus error userId createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'email name')
        .lean(),
      Note.countDocuments(filter),
    ]);

    res.json(paginatedResponse(notes, page, limit, total));
  } catch (error: any) {
    console.error('[admin] getContent error:', error);
    res.status(500).json(errorResponse('Failed to fetch content', ERROR_CODES.SERVER_ERROR));
  }
};

// PATCH /admin/users/:id/plan
export const updateUserPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subscription } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(errorResponse('Invalid user ID', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    if (subscription !== 'FREE' && subscription !== 'PRO') {
      res.status(400).json(errorResponse('subscription must be FREE or PRO', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const user = await User.findByIdAndUpdate(id, { subscription }, { new: true }).select('-password');
    if (!user) {
      res.status(404).json(errorResponse('User not found', ERROR_CODES.NOT_FOUND));
      return;
    }

    res.json(successResponse(user, `Plan updated to ${subscription}`));
  } catch (error: any) {
    console.error('[admin] updateUserPlan error:', error);
    res.status(500).json(errorResponse('Failed to update plan', ERROR_CODES.SERVER_ERROR));
  }
};

// PATCH /admin/users/:id/ban
export const toggleUserBan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { banned } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(errorResponse('Invalid user ID', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const user = await User.findByIdAndUpdate(id, { isBanned: Boolean(banned) }, { new: true }).select('-password');
    if (!user) {
      res.status(404).json(errorResponse('User not found', ERROR_CODES.NOT_FOUND));
      return;
    }

    res.json(successResponse(user, banned ? 'User banned' : 'User unbanned'));
  } catch (error: any) {
    console.error('[admin] toggleUserBan error:', error);
    res.status(500).json(errorResponse('Failed to update ban status', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/revenue
export const getRevenue = async (req: Request, res: Response) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [totalPro, totalFree, totalUsers, proByMonth, recentProUsers] = await Promise.all([
      User.countDocuments({ subscription: 'PRO' }),
      User.countDocuments({ subscription: 'FREE' }),
      User.countDocuments(),
      User.aggregate([
        { $match: { subscription: 'PRO', createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      User.find({ subscription: 'PRO' })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    res.json(successResponse({ totalPro, totalFree, totalUsers, proByMonth, recentProUsers }));
  } catch (error: any) {
    console.error('[admin] getRevenue error:', error);
    res.status(500).json(errorResponse('Failed to fetch revenue data', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/queue
export const getQueueStats = async (req: Request, res: Response) => {
  try {
    const [counts, activeJobs, waitingJobs] = await Promise.all([
      transcriptionQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      transcriptionQueue.getActive(),
      transcriptionQueue.getWaiting(0, 9),
    ]);

    const formatJob = (job: any) => ({
      id: job.id,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
    });

    res.json(successResponse({
      counts,
      activeJobs: activeJobs.map(formatJob),
      waitingJobs: waitingJobs.map(formatJob),
    }));
  } catch (error: any) {
    console.error('[admin] getQueueStats error:', error);
    res.status(500).json(errorResponse('Failed to fetch queue stats', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/feedback?page=1&limit=20&isPositive=false&startDate=2024-01-01&endDate=2024-12-31
export const getFeedback = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const { isPositive, startDate, endDate } = req.query;

    const filter: Record<string, any> = {};

    // isPositive filter: accept "true" / "false" strings from query params
    if (isPositive === 'true') {
      filter.isPositive = true;
    } else if (isPositive === 'false') {
      filter.isPositive = false;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [feedback, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'email name')
        .populate('noteId', 'title')
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    res.json(paginatedResponse(feedback, page, limit, total));
  } catch (error: any) {
    console.error('[admin] getFeedback error:', error);
    res.status(500).json(errorResponse('Failed to fetch feedback', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/referrals/summary
export const getReferralsSummary = async (req: Request, res: Response) => {
  try {
    const summary = await ReferralPartner.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'referred_by_partner',
          as: 'referred_users',
        },
      },
      {
        $lookup: {
          from: 'referralconversions',
          localField: '_id',
          foreignField: 'partner_id',
          as: 'conversions',
        },
      },
      {
        $project: {
          code: 1,
          name: 1,
          description: 1,
          is_active: 1,
          total_referrals: { $size: '$referred_users' },
          free_users: {
            $size: {
              $filter: {
                input: '$referred_users',
                as: 'u',
                cond: { $eq: ['$$u.subscription', 'FREE'] },
              },
            },
          },
          paid_users: {
            $size: {
              $filter: {
                input: '$referred_users',
                as: 'u',
                cond: { $eq: ['$$u.subscription', 'PRO'] },
              },
            },
          },
          total_paid_conversions: 1,
          total_revenue: 1,
          conversion_rate: {
            $cond: [
              { $gt: [{ $size: '$referred_users' }, 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $size: '$conversions' },
                      { $size: '$referred_users' },
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
          commission_owed: {
            $multiply: [{ $size: '$conversions' }, 1000],
          },
          createdAt: 1,
        },
      },
      { $sort: { total_paid_conversions: -1 } },
    ]);

    res.json(successResponse(summary));
  } catch (error: any) {
    console.error('[admin] getReferralsSummary error:', error);
    res.status(500).json(errorResponse('Failed to fetch referrals summary', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/referrals/:id/users
export const getReferralPartnerUsers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(errorResponse('Invalid partner ID', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const partner = await ReferralPartner.findById(id).lean();
    if (!partner) {
      res.status(404).json(errorResponse('Referral partner not found', ERROR_CODES.NOT_FOUND));
      return;
    }

    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const filter = { referred_by_partner: new mongoose.Types.ObjectId(id) };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email subscription referral_code createdAt lastActiveAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json(paginatedResponse(users, page, limit, total));
  } catch (error: any) {
    console.error('[admin] getReferralPartnerUsers error:', error);
    res.status(500).json(errorResponse('Failed to fetch partner users', ERROR_CODES.SERVER_ERROR));
  }
};

// POST /admin/referrals
export const createReferralPartner = async (req: Request, res: Response) => {
  try {
    const { code, name, description } = req.body;

    if (!code || !name) {
      res.status(400).json(errorResponse('Code and name are required', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const normalizedCode = code.toUpperCase().trim();

    const existing = await ReferralPartner.findOne({ code: normalizedCode });
    if (existing) {
      res.status(409).json(errorResponse('Referral code already exists', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const partner = new ReferralPartner({
      code: normalizedCode,
      name: name.trim(),
      description: description?.trim(),
      is_active: true,
    });

    await partner.save();
    res.json(successResponse(partner, 'Referral partner created'));
  } catch (error: any) {
    console.error('[admin] createReferralPartner error:', error);
    res.status(500).json(errorResponse('Failed to create referral partner', ERROR_CODES.SERVER_ERROR));
  }
};

// PATCH /admin/referrals/:id
export const updateReferralPartner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(errorResponse('Invalid partner ID', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const partner = await ReferralPartner.findByIdAndUpdate(id, updates, { new: true });
    if (!partner) {
      res.status(404).json(errorResponse('Referral partner not found', ERROR_CODES.NOT_FOUND));
      return;
    }

    res.json(successResponse(partner, 'Referral partner updated'));
  } catch (error: any) {
    console.error('[admin] updateReferralPartner error:', error);
    res.status(500).json(errorResponse('Failed to update referral partner', ERROR_CODES.SERVER_ERROR));
  }
};

// DELETE /admin/referrals/:id
export const deleteReferralPartner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(errorResponse('Invalid partner ID', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const partner = await ReferralPartner.findById(id);
    if (!partner) {
      res.status(404).json(errorResponse('Referral partner not found', ERROR_CODES.NOT_FOUND));
      return;
    }

    if (partner.total_paid_conversions > 0) {
      res.status(400).json(
        errorResponse(
          'Cannot delete a partner that has existing referrals. Deactivate it instead.',
          ERROR_CODES.VALIDATION_ERROR
        )
      );
      return;
    }

    await ReferralPartner.findByIdAndDelete(id);
    res.json(successResponse({ deleted: true }, 'Referral partner deleted'));
  } catch (error: any) {
    console.error('[admin] deleteReferralPartner error:', error);
    res.status(500).json(errorResponse('Failed to delete referral partner', ERROR_CODES.SERVER_ERROR));
  }
};
