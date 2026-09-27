import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { getStats, getUsers, getUserDetail, getUserIds, getContent, getRevenue, getQueueStats, updateUserPlan, toggleUserBan, bulkUserAction, manageUserQuota, getFeedback, getReferralsSummary, getReferralPartnerUsers, createReferralPartner, updateReferralPartner, deleteReferralPartner } from '../controllers/admin.controller';
import { previewAudience, sendCampaign, getCampaigns, getCampaignDetail } from '../controllers/adminNotification.controller';

const router = Router();

router.use(adminAuth);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/users/ids', getUserIds);
router.patch('/users/bulk', bulkUserAction);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id/plan', updateUserPlan);
router.patch('/users/:id/ban', toggleUserBan);
router.patch('/users/:id/quota', manageUserQuota);
router.get('/content', getContent);
router.get('/revenue', getRevenue);
router.get('/queue', getQueueStats);
router.get('/feedback', getFeedback);
router.get('/referrals/summary', getReferralsSummary);
router.get('/referrals/:id/users', getReferralPartnerUsers);
router.post('/referrals', createReferralPartner);
router.patch('/referrals/:id', updateReferralPartner);
router.delete('/referrals/:id', deleteReferralPartner);
router.get('/notifications/audience-preview', previewAudience);
router.post('/notifications/campaign', sendCampaign);
router.get('/notifications/campaigns', getCampaigns);
router.get('/notifications/campaigns/:id', getCampaignDetail);

export default router;
