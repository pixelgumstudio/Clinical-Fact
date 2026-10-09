import PostHog from 'posthog-react-native';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let client: PostHog | null = null;

// ─── Configure — call once on app launch ───────────────────────────────────
// No-ops (client stays null) if the key isn't set, so every other function
// here is safe to call unconditionally before analytics is configured.
export async function configureAnalytics(): Promise<void> {
  if (!POSTHOG_API_KEY) return;
  try {
    client = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST });
  } catch (e) {
    console.warn('[Analytics] Failed to configure PostHog:', e);
  }
}

export function identifyUser(userId: string): void {
  client?.identify(userId);
}

export function captureEvent(event: string, properties?: Record<string, any>): void {
  client?.capture(event, properties);
}
