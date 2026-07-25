import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { ReferralPartner } from '../models/ReferralPartner';
import { ReferralConversion } from '../models/ReferralConversion';

// ─── RC event types we care about ────────────────────────────────────────────
const PRO_EVENTS  = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION']);
// Only EXPIRATION means the paid period is truly over — downgrade then.
const FREE_EVENTS = new Set(['EXPIRATION']);
// CANCELLATION and BILLING_ISSUE: user still has paid time remaining.
// RC will fire EXPIRATION when the period actually ends.
const HOLD_EVENTS = new Set(['CANCELLATION', 'BILLING_ISSUE']);

export const revenueCatWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // ── Step 1: Verify the webhook is actually from RevenueCat ──────────────
    // RC sends a shared secret in the Authorization header.
    // Set REVENUECAT_WEBHOOK_SECRET in your environment variables.
    // In RC dashboard: Integrations → Webhooks → set the same secret there.
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (secret) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || authHeader !== secret) {
        console.warn('[RC Webhook] Unauthorized request — invalid secret');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    } else {
      console.warn('[RC Webhook] REVENUECAT_WEBHOOK_SECRET not set — skipping auth check');
    }

    const event = req.body?.event;
    if (!event) {
      res.status(400).json({ error: 'Missing event body' });
      return;
    }

    const eventType: string  = event.type;
    const appUserId: string  = event.app_user_id;      // This is the userId you passed to RC logIn()
    const aliases: string[]  = event.aliases ?? [];     // RC may send aliases for the same user

    console.log(`[RC Webhook] event="${eventType}" appUserId="${appUserId}"`);

    // ── Step 2: Resolve the user ────────────────────────────────────────────
    // appUserId should match the _id you passed to identifyRevenueCatUser().
    // We also check aliases in case RC merged anonymous and identified users.
    let user = await User.findById(appUserId).catch(() => null);

    if (!user && aliases.length > 0) {
      // Try aliases — RC sometimes sends the original anonymous ID as appUserId
      for (const alias of aliases) {
        user = await User.findById(alias).catch(() => null);
        if (user) break;
      }
    }

    if (!user) {
      // Not a critical error — RC sends events for anonymous users too.
      // Log and return 200 so RC doesn't retry unnecessarily.
      console.warn(`[RC Webhook] No user found for appUserId="${appUserId}" aliases=${JSON.stringify(aliases)}`);
      res.status(200).json({ received: true });
      return;
    }

    // ── Step 3: Update subscription based on event type ────────────────────
    if (PRO_EVENTS.has(eventType)) {
      if (user.subscription !== 'PRO') {
        await User.findByIdAndUpdate(user._id, { subscription: 'PRO' });
        console.log(`[RC Webhook] ✅ Upgraded userId="${user._id}" to PRO (${eventType})`);
      } else {
        console.log(`[RC Webhook] userId="${user._id}" already PRO — no change (${eventType})`);
      }

      // Track referral conversion on INITIAL_PURCHASE only (not on RENEWAL)
      if (eventType === 'INITIAL_PURCHASE') {
        const referralCode = event.subscriber_attributes?.referral_code?.value;
        if (referralCode) {
          const partner = await ReferralPartner.findOne({ code: referralCode });
          if (partner) {
            await ReferralConversion.create({
              partner_id: partner._id,
              partner_code: referralCode,
              user_id: user._id,
              revenue_cat_user_id: appUserId,
              plan: event.product_id || '',
              price: event.price || 0,
              currency: event.currency || '',
              event_type: eventType,
              converted_at: new Date(event.purchased_at_ms),
            });
            await ReferralPartner.findByIdAndUpdate(
              partner._id,
              { $inc: { total_paid_conversions: 1, total_revenue: event.price ?? 0 } }
            );
            console.log(
              `[RC Webhook] 💰 Referral conversion tracked for partner="${referralCode}" userId="${user._id}"`
            );
          }
        }
      }
    } else if (FREE_EVENTS.has(eventType)) {
      if (user.subscription !== 'FREE') {
        await User.findByIdAndUpdate(user._id, { subscription: 'FREE' });
        console.log(`[RC Webhook] 🔒 Downgraded userId="${user._id}" to FREE (${eventType})`);
      } else {
        console.log(`[RC Webhook] userId="${user._id}" already FREE — no change (${eventType})`);
      }
    } else if (HOLD_EVENTS.has(eventType)) {
      // User cancelled or payment failed — PRO access is retained until period ends.
      // RC fires EXPIRATION when the billing period is truly over.
      console.log(`[RC Webhook] ⏸ Holding PRO status for userId="${user._id}" (${eventType})`);
    } else {
      // TRANSFER, PRODUCT_CHANGE, SUBSCRIBER_ALIAS etc — no action needed
      console.log(`[RC Webhook] Unhandled event type "${eventType}" — skipping`);
    }

    // Always return 200 — RC retries on anything else
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[RC Webhook] Unexpected error:', error);
    // Still return 200 to prevent RC hammering with retries on a server error
    res.status(200).json({ received: true });
  }
};