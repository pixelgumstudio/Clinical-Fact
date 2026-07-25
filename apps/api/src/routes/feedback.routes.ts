import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { submitFeedback } from '../controllers/feedback.controller';

const router = Router();

router.post('/', authenticate, submitFeedback);

export default router;
