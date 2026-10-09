import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Platform } from 'react-native';

const RC_API_KEY_IOS     = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS     ?? '';
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '';

const ENTITLEMENT_ID = 'Clinical Fact Pro';

/** RevenueCat offering identifiers configured on the dashboard:
 *  - "Onboarding" — shown once, at the end of signup (see PaywallScreen).
 *  - "Quiz" — quiz generation/limit gates.
 *  - "exit offer" — a cheaper one-time follow-up offer, auto-presented (after a short
 *    delay) when a user closes the "Upgrade" or "Quiz" paywall without buying. Not meant
 *    to be passed in directly at a call site — see showInAppPaywall.
 *  - "Upgrade" — the default/fallback for every other gated-feature/profile trigger that
 *    doesn't have its own offering yet (notes, flashcards, chat, audio, etc. — more of
 *    these will get dedicated offerings later). */
export type PaywallOffering = 'Onboarding' | 'Quiz' | 'exit offer' | 'Upgrade';

// Offerings that get a follow-up "exit offer" paywall if the user closes them without
// purchasing. Deliberately excludes 'Onboarding' (a new signup shouldn't be chased with a
// second offer before they've even reached the app) and 'exit offer' itself (no loop).
const EXIT_OFFER_ELIGIBLE: ReadonlySet<PaywallOffering> = new Set(['Upgrade', 'Quiz']);
const EXIT_OFFER_DELAY_MS = 20_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── Types ────────────────────────────────────────────────────────────────────

export type RCSubscriptionStatus = 'premium' | 'trial' | 'cancelled' | 'free';

// ─── 1. Configure — call once on app launch ───────────────────────────────────

export async function configureRevenueCat(): Promise<void> {
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
    await Purchases.configure({ apiKey });
  } catch (e) {
    console.warn('[RC] Failed to configure:', e);
  }
}

// ─── Shared helper ────────────────────────────────────────────────────────────

function statusFromCustomerInfo(customerInfo: any): RCSubscriptionStatus {
  if (!customerInfo || !customerInfo.entitlements || !customerInfo.entitlements.active) {
    return 'free';
  }

  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  if (!entitlement)                                            return 'free';
  if (entitlement.periodType === 'trial')                      return 'trial';
  if (entitlement.isActive && entitlement.willRenew === false) return 'cancelled';
  return 'premium';
}



// ─── 2. Identify user — call after login ──────────────────────────────────────
// Returns the subscription status directly from logIn's fresh server response,
// avoiding a second round-trip that could hit a stale cache.

export async function identifyRevenueCatUser(userId: string): Promise<RCSubscriptionStatus> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return statusFromCustomerInfo(customerInfo);
  } catch (e) {
    console.warn('[RC] Failed to identify user:', e);
    return 'free';
  }
}

// ─── 3. Reset user — call on sign out ────────────────────────────────────────

export async function resetRevenueCatUser(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn('[RC] Failed to log out:', e);
  }
}

// ─── 4. Get subscription status ───────────────────────────────────────────────
// Returns: 'premium' | 'trial' | 'cancelled' | 'free'

export async function getSubscriptionStatus(): Promise<RCSubscriptionStatus> {
  try {
    const { customerInfo } = await Purchases.getCustomerInfo() as any; // @ts-ignore pre-v9 wrapper shape
    return statusFromCustomerInfo(customerInfo);
  } catch (e) {
    console.warn('[RC] Failed to get subscription status:', e);
    return 'free';
  }
}

// ─── 5. Listen for real-time changes ─────────────────────────────────────────
// Handles: new purchases, renewals, cancellations, expirations, payment failures

export function listenForSubscriptionChanges(
  callback: (status: RCSubscriptionStatus) => void
): void {
  Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    if (!entitlement) {
      callback('free');
    } else if (entitlement.periodType === 'trial') {
      callback('trial');
    } else if (entitlement.isActive && entitlement.willRenew === false) {
      callback('cancelled');
    } else {
      callback('premium');
    }
  });
}

// ─── 6. In-app paywall — shown at feature gates and profile screen ────────────
// Uses presentPaywallIfNeeded — auto-skips if user already has the entitlement
// Returns true if user has access (purchased, restored, or already subscribed)
// Defaults to the "Upgrade" offering, since every call site except PaywallScreen
// (end of onboarding) is a mid-app gated-feature/profile trigger.

export async function showInAppPaywall(offeringId: PaywallOffering = 'Upgrade'): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const offering  = offerings.all[offeringId];

    if (!offering) {
      console.warn(
        `[RC] Requested offering "${offeringId}" was not in Purchases.getOfferings(). ` +
        `Available offerings: ${Object.keys(offerings.all).join(', ') || '(none)'}`
      );
    }

    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
      offering,
    });

    if (result === PAYWALL_RESULT.NOT_PRESENTED) {
      // Already has access — RevenueCat skipped showing anything. Not an error.
      return true;
    }

    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      return true;
    }

    // CANCELLED or ERROR. For an offering that's eligible for a follow-up, give the user
    // a short beat before re-approaching with the cheaper one-time "exit offer" — showing
    // it instantly, right on the heels of a dismissal, reads as pushy.
    if (EXIT_OFFER_ELIGIBLE.has(offeringId)) {
      await wait(EXIT_OFFER_DELAY_MS);
      return showInAppPaywall('exit offer');
    }

    return false;
  } catch (e: any) {
    console.error('[RC] In-app paywall error:', e);
    return false;
  }
}
