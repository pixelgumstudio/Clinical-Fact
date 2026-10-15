import { OAuth2Client } from 'google-auth-library';

const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
};

// Create OAuth2 client for token verification
export const googleOAuthClient = new OAuth2Client(googleConfig.clientId);

/**
 * Client IDs an incoming Google ID token may be issued for. Android's native sign-in issues
 * tokens for the web client ID (GOOGLE_CLIENT_ID); the Android/iOS IDs are optional extras so a
 * token issued directly for one of the platform clients is also accepted. Read lazily so the
 * list reflects the environment at request time. Empty when none are set.
 */
export const getGoogleAudiences = (): string[] =>
  [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter((id): id is string => !!id);

export default googleConfig;
