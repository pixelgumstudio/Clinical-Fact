import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { api } from '../services/api';
import { saveTokens, clearTokens, getAccessToken, getRefreshToken } from '../services/tokenStorage';
import notificationService from '../services/notificationService';
import { queryClient } from '../lib/queryClient';
import { useSignupStore } from './signupStore';
import { useOnboardingStore } from './onboardingStore';

/** Wipe the in-memory query cache. Called on every login so the new user starts fresh. */
function clearQueryCache() {
  queryClient.clear();
}

export interface ReviewStatus {
  lastPromptedDate?: string;
  promptsThisYear: number;
  hasOptedOut: boolean;
}

export interface FreeUsageFeature {
  count: number;
}

export interface FreeUsage {
  notes?: FreeUsageFeature;
  quizzes?: FreeUsageFeature;
  flashcards?: FreeUsageFeature;
  chats?: FreeUsageFeature;
}

export interface User {
  id?: string;
  email: string;
  name?: string;
  username?: string;
  profilePicture?: string;
  isPro?: boolean;
  subscription?: 'FREE' | 'PRO';
  subscriptionPlan?: 'weekly' | 'monthly' | 'annual';
  authProvider?: 'local' | 'google' | 'apple' | 'phone';
  isEmailVerified?: boolean;
  hasCompletedSignup?: boolean;
  goals?: string[];
  contentTypes?: string[];
  reviewStyle?: string;
  preferredLanguage?: string;
  studyLanguage?: string | null;
  notesCount?: number;
  freeUsage?: FreeUsage;
  reviewStatus?: ReviewStatus;
  createdAt?: string;
  referral_code?: string;
  my_referral_code?: string;
  referral_count?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  hasCompletedOnboarding: boolean;
  isFirstTimeUser: boolean;
  needsProfileSetup: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Auth actions
  sendOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (idToken: string, accessToken?: string) => Promise<{ error: Error | null }>;
  signInWithApple: (identityToken: string, firstName?: string, lastName?: string, email?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;

  // App-level actions
  updateUser: (userData: Partial<User>) => void;
  setAuthState: (u: any, tokens: { accessToken: string; refreshToken: string }, isNewUser: boolean, needsProfileSetup: boolean) => Promise<void>;
  setOnboardingComplete: () => void;
  persistOnboardingFlag: () => void;
  setFirstTimeUser: (isFirstTime: boolean) => void;
  setNeedsProfileSetup: (needs: boolean) => void;
  completeSignup: (data: any) => Promise<void>;
  skipSignup: () => Promise<void>;

  // Lifecycle
  initialize: () => () => void;
}

/** Try to refresh the access token using the stored refresh token */
async function tryRefreshToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const response = await api.refreshToken(refreshToken);
    if (response.success && response.data?.tokens) {
      const { accessToken, refreshToken: newRefresh } = response.data.tokens;
      await saveTokens(accessToken, newRefresh);
      return accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

/** Map API user to local User shape */
function mapUser(u: any): User {
  // Normalize subscription: DB may have null for legacy accounts — treat as FREE
  const subscription: User['subscription'] = u.subscription === 'PRO' ? 'PRO' : 'FREE';
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    username: u.username,
    profilePicture: u.profilePicture,
    subscription,
    authProvider: u.authProvider,
    isEmailVerified: u.isEmailVerified,
    hasCompletedSignup: u.hasCompletedSignup ?? false,
    goals: u.goals,
    contentTypes: u.contentTypes,
    reviewStyle: u.reviewStyle,
    isPro: subscription === 'PRO',
    notesCount: u.notesCount ?? 0,
    freeUsage: u.freeUsage,
    reviewStatus: u.reviewStatus ?? { promptsThisYear: 0, hasOptedOut: false },
    createdAt: u.createdAt,
    referral_code: u.referral_code,
    my_referral_code: u.my_referral_code,
    referral_count: u.referral_count,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  hasCompletedOnboarding: false,
  isFirstTimeUser: true,
  needsProfileSetup: false,
  isLoading: false,
  isInitialized: false,

  // ─── Auth actions ──────────────────────────────────────────────────────────

  sendOtp: async (email) => {
    set({ isLoading: true });
    try {
      const response = await api.sendOtp(email);
      set({ isLoading: false });
      if (!response.success) {
        return { error: new Error(response.message || 'Failed to send OTP') };
      }
      return { error: null };
    } catch (err: any) {
      set({ isLoading: false });
      return { error: new Error(err.message || 'Failed to send OTP') };
    }
  },

  verifyOtp: async (email, token) => {
    set({ isLoading: true });
    try {
      const response = await api.verifyOtp(email, token);
      if (!response.success || !response.data?.tokens) {
        set({ isLoading: false });
        return { error: new Error(response.message || 'Invalid OTP') };
      }

      const { tokens, user: u, needsProfileSetup, isNewUser } = response.data;
      await clearQueryCache();
      await saveTokens(tokens.accessToken, tokens.refreshToken);

      const mapped = mapUser(u);
      set({
        isAuthenticated: true,
        user: mapped,
        isFirstTimeUser: isNewUser ?? false,
        needsProfileSetup: needsProfileSetup ?? !u.hasCompletedSignup,
        isLoading: false,
        isInitialized: true,
      });
      Sentry.setUser({ id: mapped.id, email: mapped.email });

      return { error: null };
    } catch (err: any) {
      set({ isLoading: false });
      return { error: new Error(err.message || 'Failed to verify OTP') };
    }
  },

  signInWithGoogle: async (idToken, accessToken) => {
    set({ isLoading: true });
    try {
      const response = await api.googleAuth(idToken, accessToken);
      if (!response.success || !response.data?.tokens) {
        set({ isLoading: false });
        return { error: new Error(response.message || 'Google authentication failed') };
      }

      const { tokens, user: u, needsProfileSetup, isNewUser } = response.data;
      await clearQueryCache();
      await saveTokens(tokens.accessToken, tokens.refreshToken);

      const mapped = mapUser(u);
      set({
        isAuthenticated: true,
        user: mapped,
        isFirstTimeUser: isNewUser ?? false,
        needsProfileSetup: needsProfileSetup ?? !u.hasCompletedSignup,
        isLoading: false,
        isInitialized: true,
      });
      Sentry.setUser({ id: mapped.id, email: mapped.email });

      return { error: null };
    } catch (err: any) {
      set({ isLoading: false });
      return { error: new Error(err.message || 'Google authentication failed') };
    }
  },

  signInWithApple: async (identityToken, firstName, lastName, email) => {
    set({ isLoading: true });
    try {
      const response = await api.appleAuth(identityToken, firstName, lastName, email);
      if (!response.success || !response.data?.tokens) {
        set({ isLoading: false });
        return { error: new Error(response.message || 'Apple authentication failed') };
      }

      const { tokens, user: u, needsProfileSetup, isNewUser } = response.data;
      await clearQueryCache();
      await saveTokens(tokens.accessToken, tokens.refreshToken);

      const mapped = mapUser(u);
      set({
        isAuthenticated: true,
        user: mapped,
        isFirstTimeUser: isNewUser ?? false,
        needsProfileSetup: needsProfileSetup ?? !u.hasCompletedSignup,
        isLoading: false,
        isInitialized: true,
      });
      Sentry.setUser({ id: mapped.id, email: mapped.email });

      return { error: null };
    } catch (err: any) {
      set({ isLoading: false });
      return { error: new Error(err.message || 'Apple authentication failed') };
    }
  },

  signOut: async () => {
    // 0. Best-effort: stop this device from receiving push notifications for the account
    //    that's about to be signed out. Must happen before tokens are cleared below since
    //    unregistering requires an authenticated request.
    try {
      const pushToken = await notificationService.getDevicePushToken();
      if (pushToken) {
        await api.unregisterDeviceToken(pushToken);
      }
    } catch {
      // Non-fatal — the token will just go stale server-side until the next login re-registers it.
    }

    // 1. Abort any in-flight requests so they cannot write stale data back to
    //    the cache after we clear it.
    await queryClient.cancelQueries();

    // 2. Wipe the JS-memory cache immediately. With the cache empty the
    //    persister has nothing to serialize, closing the window where a
    //    throttled write could resurrect old data after we wipe the disk.
    queryClient.clear();

    // 3. Outlast the persister's 1-second throttle. The persister in App.tsx
    //    is configured with throttleTime: 1000. Any write that was already
    //    queued before step 2 will flush during this window — writing an empty
    //    cache — so no stale snapshot can land on disk after we wipe below.
    await new Promise<void>((r) => setTimeout(r, 1100));

    // 4. Scorched-earth disk wipe. We do NOT rely on currentUserId because
    //    it may be undefined (cold-start race) or point to only one of several
    //    orphaned keys. Delete every key that matches our cache prefix so no
    //    note data survives on the device regardless of session state.
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith('clinicalfact-query-cache-'));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }

    // 5. Clear auth tokens and reset Zustand state.
    await Promise.all([
      clearTokens(),
      AsyncStorage.removeItem('@clinicalfact:signup_complete'),
    ]);
    set({
      user: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      isFirstTimeUser: true,
      needsProfileSetup: false,
      isLoading: false,
    });
    Sentry.setUser(null);

    // 6. Wipe persisted wizard stores so a fresh user never sees stale form data.
    useSignupStore.getState().resetSignup();
    useOnboardingStore.getState().resetOnboarding();
  },

  // ─── App-level actions ────────────────────────────────────────────────────

  updateUser: (userData) => {
    const currentUser = get().user;
    if (!currentUser) return;
    set({ user: { ...currentUser, ...userData } });
  },

  setAuthState: async (u, tokens, isNewUser, needsProfileSetup) => {
    await clearQueryCache();
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    const mapped = mapUser(u);
    set({
      isAuthenticated: true,
      user: mapped,
      isFirstTimeUser: isNewUser,
      needsProfileSetup,
      isLoading: false,
      isInitialized: true,
    });
    Sentry.setUser({ id: mapped.id, email: mapped.email });
  },

  setOnboardingComplete: () => {
    const currentUser = get().user;
    set({
      hasCompletedOnboarding: true,
      isFirstTimeUser: false,
      needsProfileSetup: false,
      ...(currentUser && { user: { ...currentUser, hasCompletedSignup: true } }),
    });
    AsyncStorage.setItem('@clinicalfact:signup_complete', '1').catch(() => {});
  },

  // Writes only the crash-protection AsyncStorage flag without touching in-memory
  // auth state. Used mid-onboarding so a hard-kill during the paywall doesn't
  // replay the whole signup flow, while preserving the navKey guard for the
  // DemoVideo → Paywall steps that still need to run.
  persistOnboardingFlag: () => {
    AsyncStorage.setItem('@clinicalfact:signup_complete', '1').catch(() => {});
  },

  setFirstTimeUser: (isFirstTime) => set({ isFirstTimeUser: isFirstTime }),

  setNeedsProfileSetup: (needs) => set({ needsProfileSetup: needs }),

  completeSignup: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.completeSignup(data);
      if (response.success && response.data?.user) {
        set({
          user: mapUser(response.data.user),
          needsProfileSetup: false,
          isLoading: false,
        });
        useSignupStore.getState().resetSignup();
      } else {
        throw new Error(response.message || 'Failed to complete signup');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  skipSignup: async () => {
    set({ isLoading: true });
    try {
      const response = await api.skipSignup();
      if (response.success && response.data?.user) {
        set({
          user: mapUser(response.data.user),
          needsProfileSetup: false,
          isLoading: false,
        });
        useSignupStore.getState().resetSignup();
      } else {
        throw new Error(response.message || 'Failed to skip signup');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  initialize: () => {
    (async () => {
      try {
        const [accessToken, localCompleteFlag] = await Promise.all([
          getAccessToken(),
          AsyncStorage.getItem('@clinicalfact:signup_complete'),
        ]);
        const localOnboardingDone = localCompleteFlag === '1';

        if (!accessToken) {
          set({ isInitialized: true, isLoading: false });
          return;
        }

        // Try fetching user profile with current token
        let response = await api.getMe();

        // If 401, try refreshing
        if (!response.success && response.message?.includes('expired')) {
          const refreshed = await tryRefreshToken();
          if (!refreshed) {
            await clearTokens();
            set({ isInitialized: true, isLoading: false });
            return;
          }
          response = await api.getMe();
        }

        if (response.success && response.data?.user) {
          const u = response.data.user;
          set({
            isAuthenticated: true,
            user: mapUser(u),
            needsProfileSetup: !u.hasCompletedSignup && !localOnboardingDone,
            hasCompletedOnboarding: u.hasCompletedSignup || localOnboardingDone,
            isFirstTimeUser: false,
            isLoading: false,
            isInitialized: true,
          });
          Sentry.setUser({ id: u.id, email: u.email });
        } else {
          // Token invalid — clear and start fresh
          await clearTokens();
          set({ isInitialized: true, isLoading: false });
        }
      } catch {
        await clearTokens();
        set({ isInitialized: true, isLoading: false });
      }
    })();

    // Return no-op unsubscribe (no listener to clean up)
    return () => {};
  },
}));
