import PostHog from 'posthog-react-native';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let client: PostHog | null = null;

// Everything below is safe to call before analytics is configured, or with no key at all: it does nothing.
// Never put what a user typed (chat messages, note text, document names) in an event — the properties
// here are counts, modes and ids only.

// ─── Configure — call once on app launch ───────────────────────────────────
export async function configureAnalytics(): Promise<void> {
  if (!POSTHOG_API_KEY || client) return;
  try {
    client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      captureAppLifecycleEvents: true, // Application Installed / Opened / Backgrounded / Updated
      flushAt: 10,
      flushInterval: 15000,
      // Screen recording. Needs the native module, so it only records in a store/TestFlight build made
      // after it was added; older builds ignore it. Privacy: everything typed into an input, and every image
      // (note photos, uploads), is masked; chat questions are masked where they are rendered.
      enableSessionReplay: true,
      sessionReplayConfig: {
        maskAllTextInputs: true,
        maskAllImages: true,
        maskAllSandboxedViews: true,
        captureLog: false,
        captureNetworkTelemetry: false,
        captureTouches: true,
      },
    });
  } catch (e) {
    console.warn('[Analytics] Failed to configure PostHog:', e);
  }
}

/** Ties this device's events to the signed-in account; `properties` become person properties (plan, language...). */
export function identifyUser(userId: string, properties?: Record<string, any>): void {
  client?.identify(userId, properties);
}

/** Call on sign-out so the next person on this device isn't recorded as the previous user. */
export function resetAnalytics(): void {
  client?.reset();
}

export function captureEvent(event: string, properties?: Record<string, any>): void {
  client?.capture(event, properties);
}

/** One screen view; the route name is the screen's name in the navigator ("Home", "ChatConversation"...). */
export function trackScreen(routeName: string, properties?: Record<string, any>): void {
  client?.screen(routeName, properties);
}
