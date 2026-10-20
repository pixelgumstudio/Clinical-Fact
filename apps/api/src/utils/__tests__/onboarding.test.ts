import { onboardingPayload, PENDING_ONBOARDING } from '../onboarding';

describe('onboardingPayload', () => {
  test('accounts that predate the field have nothing pending', () => {
    expect(onboardingPayload({})).toEqual({ firstChatPending: false, walkthroughPending: false });
    expect(onboardingPayload({ onboarding: null })).toEqual({ firstChatPending: false, walkthroughPending: false });
  });

  test('reports each step as stored', () => {
    expect(onboardingPayload({ onboarding: { firstChatPending: true, walkthroughPending: true } })).toEqual({
      firstChatPending: true,
      walkthroughPending: true,
    });
    expect(onboardingPayload({ onboarding: { firstChatPending: false, walkthroughPending: true } })).toEqual({
      firstChatPending: false,
      walkthroughPending: true,
    });
  });

  test('registration marks both steps pending', () => {
    expect(PENDING_ONBOARDING).toEqual({ 'onboarding.firstChatPending': true, 'onboarding.walkthroughPending': true });
  });
});
