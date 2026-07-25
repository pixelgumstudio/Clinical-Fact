import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Platform } from 'react-native';

const RC_API_KEY_IOS     = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS     ?? '';
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? '';

const ENTITLEMENT_ID = 'ClinicFact Pro';
const INAPP_OFFERING = 'inapp offering';

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

export async function showInAppPaywall(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const offering  = offerings.all[INAPP_OFFERING];

    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
      offering,
    });

    return (
      result === PAYWALL_RESULT.PURCHASED  ||
      result === PAYWALL_RESULT.RESTORED   ||
      result === PAYWALL_RESULT.NOT_PRESENTED // already has access, paywall skipped
    );
  } catch (e) {
    console.error('[RC] In-app paywall error:', e);
    return false;
  }
}
