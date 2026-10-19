import { finishPaywallSession, getPaywallSession, startPaywallSession } from '../paywallSession';

const offering = { identifier: 'Upgrade' } as any;

describe('paywallSession', () => {
  afterEach(() => finishPaywallSession('cancelled'));

  test('the paywall screen can read the request and report how it ended', async () => {
    const outcome = startPaywallSession(offering);
    expect(getPaywallSession()?.offering).toBe(offering);
    finishPaywallSession('purchased');
    await expect(outcome).resolves.toBe('purchased');
    expect(getPaywallSession()).toBeNull();
  });

  test('finishing twice keeps the first outcome', async () => {
    const outcome = startPaywallSession(offering);
    finishPaywallSession('restored');
    finishPaywallSession('cancelled');
    await expect(outcome).resolves.toBe('restored');
  });

  test('a new request settles an abandoned one as cancelled', async () => {
    const first = startPaywallSession(offering);
    const second = startPaywallSession(offering);
    await expect(first).resolves.toBe('cancelled');
    finishPaywallSession('purchased');
    await expect(second).resolves.toBe('purchased');
  });

  test('finishing with no request is harmless', () => {
    expect(() => finishPaywallSession('cancelled')).not.toThrow();
  });
});
