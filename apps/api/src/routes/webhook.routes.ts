import { Router } from 'express';
import { revenueCatWebhook } from '../controllers/webhook.controller';
import express from 'express';

const router = Router();

// IMPORTANT: This route must use express.raw() or express.json() BEFORE
// your global body parser runs, otherwise the body arrives already parsed
// and the raw bytes for signature verification are lost.
// Since RC uses JSON (not raw bytes for auth), express.json() is fine here.
router.post(
  '/revenuecat',
  express.json(),
  revenueCatWebhook
);

export default router;