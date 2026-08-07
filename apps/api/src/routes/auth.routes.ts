import { Router } from 'express';
import {
  register,
  login,
  getMe,
  googleAuth,
  appleAuth,
  refreshToken,
  updateProfile,
  completeSignup,
  skipSignup,
  checkUsernameAvailability,
  deleteAccount,
  uploadProfilePicture,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import upload from '../middleware/uploadMiddleware';
import { registerSchema, loginSchema } from '@clinicalfact/validation';

const router = Router();

// Public routes - Username validation
router.post('/check-username', checkUsernameAvailability);
router.get('/check-username/:username', checkUsernameAvailability);

// Public routes - Email/Password Auth
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Public routes - OAuth
router.post('/google', googleAuth);
router.post('/apple', appleAuth);

// Public routes - Token Management
router.post('/refresh-token', refreshToken); // legacy path kept for backward compat
router.post('/refresh', refreshToken);       // canonical path

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.post('/profile/picture', authenticate, upload.single('file'), uploadProfilePicture);
router.post('/complete-signup', authenticate, completeSignup);
router.post('/skip-signup', authenticate, skipSignup);
router.delete('/account', authenticate, deleteAccount);

export default router;
