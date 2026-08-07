import { useSubscriptionStore } from '../store/subscriptionStore';
import { showInAppPaywall } from '../services/revenuecat';

export type QuotaFeature = 'notes' | 'quizzes' | 'flashcards' | 'chats' | 'medicalChats';

/**
 * Returns a `withAccess` wrapper.
 *
 * For premium users (hasAccess): runs the action immediately.
 *
 * For free users: runs the action. If the action returns an API response with
 * `quotaExceeded: true` (HTTP 402 from the server), the in-app paywall is shown.
 * The action itself is NOT retried — callers should await `withAccess` and
 * re-trigger their flow after a successful purchase if needed.
 *
 * `featureType` is an optional hint used for typing and future context-aware UI.
 */
export function useGatedFeature() {
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);

  const withAccess = async (
    action: () => void | Promise<any>,
    _featureType?: QuotaFeature,
  ) => {
    if (hasAccess) {
      await action();
      return;
    }

    // Free user — run the action and inspect the result for a quota 402.
    const result = await action();
    if (result?.quotaExceeded === true) {
      await showInAppPaywall();
    }
  };

  return { withAccess };
}
