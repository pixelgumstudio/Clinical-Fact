import express from 'express';
import { validateReferralCode, applyReferralCode, getReferredFriends } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Validate a referral code — public endpoint (no auth required)
router.post('/validate', validateReferralCode);

// Apply a referral code to the current user — requires authentication
router.post('/apply', authenticate, applyReferralCode);

// Get list of friends referred by the current user
router.get('/friends', authenticate, getReferredFriends);

export default router;
