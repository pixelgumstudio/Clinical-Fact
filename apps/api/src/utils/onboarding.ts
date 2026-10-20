/** What a user payload reports about first-run steps; accounts without the field have nothing pending. */
export const onboardingPayload = (user: { onboarding?: { firstChatPending?: boolean; walkthroughPending?: boolean } | null }) => ({
  firstChatPending: user.onboarding?.firstChatPending === true,
  walkthroughPending: user.onboarding?.walkthroughPending === true,
});

/** Mongo `$set` that marks the first-run steps as pending — applied when registration completes. */
export const PENDING_ONBOARDING = {
  'onboarding.firstChatPending': true,
  'onboarding.walkthroughPending': true,
} as const;
