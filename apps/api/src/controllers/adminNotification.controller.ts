import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import NotificationCampaign from '../models/NotificationCampaign';
import notificationService from '../services/notification.service';
import analyticsService from '../services/analytics.service';
import { buildUserFilter } from '../utils/userFilters';
import { successResponse, errorResponse, paginatedResponse, ERROR_CODES } from '../utils/response';

// GET /admin/notifications/audience-preview
// Same filter params as GET /admin/users, plus optional platform, to show
// admins how many devices a campaign would reach before they send it.
export const previewAudience = async (req: Request, res: Response) => {
  try {
    const filter = buildUserFilter(req.query as any);
    const platform = (req.query.platform as string) || 'all';

    const users = await User.find(filter).select('deviceTokens').lean();

    let iosDeviceCount = 0;
    let androidDeviceCount = 0;
    for (const user of users) {
      for (const deviceToken of user.deviceTokens || []) {
        if (deviceToken.platform === 'ios') iosDeviceCount++;
        else if (deviceToken.platform === 'android') androidDeviceCount++;
      }
    }

    const targetDeviceCount =
      platform === 'ios' ? iosDeviceCount : platform === 'android' ? androidDeviceCount : iosDeviceCount + androidDeviceCount;

    res.json(
      successResponse({
        userCount: users.length,
        iosDeviceCount,
        androidDeviceCount,
        targetDeviceCount,
      })
    );
  } catch (error: any) {
    console.error('[admin] previewAudience error:', error);
    res.status(500).json(errorResponse('Failed to preview audience', ERROR_CODES.SERVER_ERROR));
  }
};

// POST /admin/notifications/campaign
// Audience is either a saved-filter segment (`filters`, same shape as GET
// /admin/users) or an explicit list of user ids (`userIds`, from the Users
// page's bulk-select) — never both. The latter lets ad-hoc "send to these N
// selected users" actions reuse the same send path and show up in campaign
// history alongside filter-based segment sends.
export const sendCampaign = async (req: Request, res: Response) => {
  try {
    const { title, body, data, platform, filters, userIds } = req.body;

    if (!title || !body) {
      res.status(400).json(errorResponse('Title and body are required', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const normalizedPlatform: 'ios' | 'android' | 'all' =
      platform === 'ios' || platform === 'android' ? platform : 'all';

    const hasExplicitIds = Array.isArray(userIds) && userIds.length > 0;
    const userFilter = hasExplicitIds ? { _id: { $in: userIds } } : buildUserFilter(filters || {});
    const audienceFilterSnapshot = hasExplicitIds ? { userIds } : filters || {};

    // Generated up front (not left to Mongo on .create()) so it can ride
    // along in the push payload itself — the mobile app reads data.campaignId
    // on tap to attribute the resulting app-open back to this campaign in
    // PostHog, which a campaign _id assigned only after sending couldn't do.
    const campaignId = new mongoose.Types.ObjectId();
    const payloadData = { ...(data || {}), campaignId: campaignId.toString() };

    const result = await notificationService.sendCampaign(userFilter, normalizedPlatform, title, body, payloadData);

    const status =
      result.audienceCount === 0
        ? 'no_recipients'
        : result.failedCount === 0
          ? 'sent'
          : result.sentCount === 0
            ? 'failed'
            : 'partial';

    const campaign = await NotificationCampaign.create({
      _id: campaignId,
      title,
      body,
      data,
      platform: normalizedPlatform,
      audienceFilter: audienceFilterSnapshot,
      audienceCount: result.audienceCount,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      sentByPlatform: result.sentByPlatform,
      failedByPlatform: result.failedByPlatform,
      status,
    });

    analyticsService.capture('notification_campaign_sent', 'admin', {
      campaignId: campaignId.toString(),
      platform: normalizedPlatform,
      audienceSource: hasExplicitIds ? 'explicit_selection' : 'filter_segment',
      audienceFilter: audienceFilterSnapshot,
      audienceCount: result.audienceCount,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      sentByPlatform: result.sentByPlatform,
      failedByPlatform: result.failedByPlatform,
      status,
    });

    res.json(successResponse({ campaign }));
  } catch (error: any) {
    console.error('[admin] sendCampaign error:', error);
    res.status(500).json(errorResponse('Failed to send campaign', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/notifications/campaigns?page=1&limit=20
export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const [campaigns, total] = await Promise.all([
      NotificationCampaign.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NotificationCampaign.countDocuments(),
    ]);

    res.json(paginatedResponse(campaigns, page, limit, total));
  } catch (error: any) {
    console.error('[admin] getCampaigns error:', error);
    res.status(500).json(errorResponse('Failed to fetch campaigns', ERROR_CODES.SERVER_ERROR));
  }
};

// GET /admin/notifications/campaigns/:id
export const getCampaignDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json(errorResponse('Invalid campaign ID', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    const campaign = await NotificationCampaign.findById(id).lean();
    if (!campaign) {
      res.status(404).json(errorResponse('Campaign not found', ERROR_CODES.NOT_FOUND));
      return;
    }

    res.json(successResponse({ campaign }));
  } catch (error: any) {
    console.error('[admin] getCampaignDetail error:', error);
    res.status(500).json(errorResponse('Failed to fetch campaign', ERROR_CODES.SERVER_ERROR));
  }
};
