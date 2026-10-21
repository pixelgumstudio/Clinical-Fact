import Purchases, { LOG_LEVEL, PurchasesOffering } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Alert, Platform } from 'react-native';
import i18n from '../i18n';
import { navigationRef } from '../navigation/navigationRef';
import { PaywallOutcome, startPaywallSession } from './paywallSession';

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

// Maps each paywall name to its RevenueCat offering identifier on the dashboard.
// The onboarding paywall is attached to the dashboard's "default" offering.
const OFFERING_IDS: Record<PaywallOffering, string> = {
  Onboarding: 'default',
  Quiz: 'Quiz',
  'exit offer': 'exit offer',
  Upgrade: 'Upgrade',
};

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

// A paywall that fails to open used to fail silently, which on a gated action (a quiz or note
// past the free limit) looks like the button doing nothing. Tell the user instead — except for
// the optional follow-up "exit offer" and the end-of-signup paywall, which they never asked for
// (signup completes either way).
// Why the paywall couldn't open, kept short and appended to the alert while we track down a
// production-only failure (the generic message alone doesn't say which step failed).
let lastPaywallReason = '';

function notifyPaywallUnavailable(offeringId: PaywallOffering): void {
  if (offeringId === 'exit offer' || offeringId === 'Onboarding') return;
  Alert.alert(
    i18n.t('services.revenuecat.upgradeUnavailable'),
    `${i18n.t('services.revenuecat.weCouldnTOpenTheUpgrade')}${lastPaywallReason ? `

(${lastPaywallReason})` : ''}`
  );
}

/** The RevenueCat offering to show for a paywall name, or null (after logging, and telling the user
 *  for a paywall they asked for) when none with purchasable packages exists. */
export async function getPaywallOffering(offeringId: PaywallOffering): Promise<PurchasesOffering | null> {
  lastPaywallReason = '';
  const offerings = await Purchases.getOfferings();
  const offeringKey = OFFERING_IDS[offeringId];
  let offering: PurchasesOffering | undefined = offerings.all[offeringKey];

  // An offering that exists but has no purchasable packages for this store (e.g. the Google
  // Play products were never attached to it) can't render a paywall — use the current offering
  // so the user still sees one, and log which dashboard entry needs fixing.
  if (!offering || offering.availablePackages.length === 0) {
    console.warn(
      `[RC] Offering "${offeringKey}" ${offering ? 'has no packages for this store' : 'was not in Purchases.getOfferings()'}. ` +
      `Available offerings: ${Object.keys(offerings.all).join(', ') || '(none)'}`
    );
    const current = offerings.current;
    offering = current && current.availablePackages.length > 0 ? current : undefined;
  }

  if (!offering) {
    lastPaywallReason = `no offering with packages; wanted "${offeringKey}", have: ${Object.keys(offerings.all).join(', ') || 'none'}; current: ${offerings.current?.identifier ?? 'none'}`;
    console.error(`[RC] No offering with packages is available for "${offeringId}" — cannot show a paywall.`);
    notifyPaywallUnavailable(offeringId);
    return null;
  }
  return offering;
}

/** True when the user already has the Pro entitlement (so no paywall is needed). */
export async function hasProEntitlement(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return !!info.entitlements.active[ENTITLEMENT_ID];
}

export async function showInAppPaywall(offeringId: PaywallOffering = 'Upgrade'): Promise<boolean> {
  try {
    const offering = await getPaywallOffering(offeringId);
    if (!offering) return false;

    // Already has access — nothing to show. Not an error.
    if (await hasProEntitlement()) return true;

    // The paywall is a full-page screen in the main stack. Before the navigator exists (or outside
    // the signed-in app) fall back to RevenueCat's own presentation so a gate is never a dead end.
    let outcome: PaywallOutcome;
    if (navigationRef.isReady()) {
      const finished = startPaywallSession(offering);
      navigationRef.navigate('Paywall');
      outcome = await finished;
    } else {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
        offering,
      });
      outcome =
        result === PAYWALL_RESULT.PURCHASED ? 'purchased'
        : result === PAYWALL_RESULT.RESTORED || result === PAYWALL_RESULT.NOT_PRESENTED ? 'restored'
        : result === PAYWALL_RESULT.ERROR ? 'error'
        : 'cancelled';
    }

    if (outcome === 'purchased' || outcome === 'restored') return true;

    if (outcome === 'error') {
      if (!lastPaywallReason) lastPaywallReason = String(outcome);
      console.error(`[RC] Paywall for "${OFFERING_IDS[offeringId]}" failed (outcome: error).`);
      notifyPaywallUnavailable(offeringId);
      return false;
    }

    // Closed without buying. For an offering that's eligible for a follow-up, give the user
    // a short beat before re-approaching with the cheaper one-time "exit offer" — showing
    // it instantly, right on the heels of a dismissal, reads as pushy.
    if (EXIT_OFFER_ELIGIBLE.has(offeringId)) {
      await wait(EXIT_OFFER_DELAY_MS);
      return showInAppPaywall('exit offer');
    }

    return false;
  } catch (e: any) {
    console.error('[RC] In-app paywall error:', e);
    lastPaywallReason = `${e?.code ?? 'error'}: ${String(e?.message ?? e).slice(0, 140)}`;
    notifyPaywallUnavailable(offeringId);
    return false;
  }
}
