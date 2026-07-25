import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { getStats, getUsers, getUserDetail, getContent, getRevenue, getQueueStats, updateUserPlan, toggleUserBan, getFeedback, getReferralsSummary, getReferralPartnerUsers, createReferralPartner, updateReferralPartner, deleteReferralPartner } from '../controllers/admin.controller';

const router = Router();

router.use(adminAuth);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id/plan', updateUserPlan);
router.patch('/users/:id/ban', toggleUserBan);
router.get('/content', getContent);
router.get('/revenue', getRevenue);
router.get('/queue', getQueueStats);
router.get('/feedback', getFeedback);
router.get('/referrals/summary', getReferralsSummary);
router.get('/referrals/:id/users', getReferralPartnerUsers);
router.post('/referrals', createReferralPartner);
router.patch('/referrals/:id', updateReferralPartner);
router.delete('/referrals/:id', deleteReferralPartner);

export default router;
