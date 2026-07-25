import { Request, Response } from 'express';
import { ReferralPartner } from '../models/ReferralPartner';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const getReferredFriends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [friends, total] = await Promise.all([
      User.find({ referred_by_user: userId }, { name: 1, username: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ referred_by_user: userId }),
    ]);

    res.json({
      success: true,
      data: {
        friends: friends.map(f => ({ name: (f as any).name || (f as any).username, joinedAt: (f as any).createdAt })),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Referral] getReferredFriends error:', error);
    res.status(500).json({ error: 'Failed to fetch referred friends' });
  }
};

export const validateReferralCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    const upperCode = code.toUpperCase().trim();

    // Check partner codes first
    const partner = await ReferralPartner.findOne({
      code: upperCode,
      is_active: true,
    });

    if (partner) {
      res.json({ success: true, message: 'Referral code validated', data: { valid: true, type: 'partner' } });
      return;
    }

    // Check user referral codes
    const referrer = await User.findOne({ my_referral_code: upperCode });

    if (referrer) {
      res.json({ success: true, message: 'Referral code validated', data: { valid: true, type: 'user' } });
    } else {
      res.json({ success: true, message: 'Referral code not found', data: { valid: false } });
    }
  } catch (error) {
    console.error('[Referral] validateReferralCode error:', error);
    res.status(500).json({ error: 'Failed to validate referral code' });
  }
};

export const applyReferralCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    const userId = req.user?._id;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const upperCode = code.toUpperCase().trim();

    // Check partner codes first
    const partner = await ReferralPartner.findOne({
      code: upperCode,
      is_active: true,
    });

    if (partner) {
      // Partner referral — set referral_code + referred_by_partner
      await User.updateOne(
        { _id: userId, referral_code: { $exists: false } },
        {
          referral_code: upperCode,
          referred_by_partner: partner._id,
        }
      );
      res.json({ success: true });
      return;
    }

    // Check user referral codes
    const referrer = await User.findOne({ my_referral_code: upperCode });

    if (!referrer) {
      res.status(404).json({ error: 'Referral code not found' });
      return;
    }

    // Prevent self-referral
    if (String(referrer._id) === String(userId)) {
      res.status(400).json({ error: 'Cannot use your own code' });
      return;
    }

    // User referral — set referred_by_user
    await User.updateOne(
      { _id: userId, referred_by_user: { $exists: false } },
      { referred_by_user: referrer._id }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Referral] applyReferralCode error:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
};
