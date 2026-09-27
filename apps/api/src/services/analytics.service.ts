/**
 * Server-side PostHog wrapper. Captures marketing/admin-outcome events that
 * need to be reliable even though the thing they describe (delivery results,
 * bulk actions) happens server-side, not in a browser — e.g. notification
 * delivery counts, which arrive from Expo async and can't be captured
 * client-side. No-ops entirely if POSTHOG_API_KEY isn't set, so this is safe
 * to call before the project's PostHog key has been configured.
 */

import { PostHog } from 'posthog-node';

const apiKey = process.env.POSTHOG_API_KEY;

const client = apiKey
  ? new PostHog(apiKey, { host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com' })
  : null;

class AnalyticsService {
  capture(event: string, distinctId: string, properties?: Record<string, any>): void {
    if (!client) return;
    client.capture({ distinctId, event, properties });
  }

  async shutdown(): Promise<void> {
    if (!client) return;
    await client.shutdown();
  }
}

export default new AnalyticsService();
