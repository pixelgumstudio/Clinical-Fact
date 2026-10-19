import type { PurchasesOffering } from 'react-native-purchases';

export type PaywallOutcome = 'purchased' | 'restored' | 'cancelled' | 'error';

interface PaywallSession {
  offering: PurchasesOffering;
  resolve: (outcome: PaywallOutcome) => void;
}

// A paywall is opened from code that has no screen of its own (showInAppPaywall is called from
// hooks, modals and services) and the RevenueCat offering object can't travel through navigation
// params, so the full-page paywall screen picks up the request from here and reports back.
let pending: PaywallSession | null = null;

/** Registers a paywall request; resolves when the paywall screen reports how it ended. */
export function startPaywallSession(offering: PurchasesOffering): Promise<PaywallOutcome> {
  pending?.resolve('cancelled'); // a newer request replaces an abandoned one
  return new Promise<PaywallOutcome>((resolve) => {
    pending = { offering, resolve };
  });
}

export function getPaywallSession(): PaywallSession | null {
  return pending;
}

/** Ends the current request. Safe to call more than once. */
export function finishPaywallSession(outcome: PaywallOutcome): void {
  const session = pending;
  pending = null;
  session?.resolve(outcome);
}
