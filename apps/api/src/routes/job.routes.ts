import { Router } from 'express';
import { getJobStatus, streamJobStatus } from '../controllers/job.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/:jobId/stream', authenticate, streamJobStatus);
router.get('/:jobId', authenticate, getJobStatus);

export default router;
