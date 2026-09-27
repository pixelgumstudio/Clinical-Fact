/**
 * Shared Mongo filter builder for admin user queries.
 * Used by both the Users list (GET /admin/users) and the notification
 * campaign audience selector, so both stay in sync on filter semantics.
 */

export interface UserFilterQuery {
  search?: string;
  plan?: string;
  dateFrom?: string;
  dateTo?: string;
  lastActive?: string;
  goals?: string;
  referralSource?: string;
  reviewStyle?: string;
  contentTypes?: string;
  frustrations?: string;
}

export function buildUserFilter(query: UserFilterQuery): Record<string, any> {
  const {
    search,
    plan,
    dateFrom,
    dateTo,
    lastActive,
    goals,
    referralSource,
    reviewStyle,
    contentTypes,
    frustrations,
  } = query;

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

  return filter;
}

export const USER_SORT_OPTIONS: Record<string, any> = {
  createdAt: { createdAt: -1 },
  lastActive: { lastActiveAt: -1 },
  name: { name: 1 },
};
