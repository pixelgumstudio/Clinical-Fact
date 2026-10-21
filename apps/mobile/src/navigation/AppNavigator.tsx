import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainStackNavigator } from './MainStackNavigator';
import { getAuthStartRoute } from './authStartRoute';
import { hasChosenLanguage, markLanguageChosen } from '../services/languagePreference';
import { navigationRef } from './navigationRef';
import { useAuthStore } from '../store/authStore';
import { useSignupStore } from '../store/signupStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import api from '../services/api';
import {
  configureRevenueCat,
  listenForSubscriptionChanges,
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from '../services/revenuecat';
import { colors } from '@clinicalfact/design-system';

const linking: LinkingOptions<any> = {
  prefixes: ['clinicalfact://'],
  config: {
    screens: {
      SharedNote: 'shared/:shareableLink',
    },
  },
};

export const AppNavigator = () => {
  const {
    isAuthenticated,
    initialize,
    isInitialized,
    isFirstTimeUser,
    user,
    needsProfileSetup,
  } = useAuthStore();

  const { authMethod } = useSignupStore();
  const { setStatus, syncBackendSubscription, reset: resetSubscription } = useSubscriptionStore();

  // While identify is in flight, RC fires the listener with the anonymous
  // (empty) user info as it transitions — we suppress those 'free' events
  // to prevent them from overwriting the premium status we're about to set.
  const identifyingRef = useRef(false);

  // ── Configure RC once on mount + start real-time listener ────────────────
  useEffect(() => {
    configureRevenueCat();
    listenForSubscriptionChanges((status) => {
      // Suppress 'free' noise fired during the logOut→logIn transition
      if (identifyingRef.current && status === 'free') return;
      setStatus(status);
    });
  }, []);

  // ── Identify / reset RC user when auth state changes ─────────────────────
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      identifyingRef.current = true;
      identifyRevenueCatUser(user.id).then((status) => {
        identifyingRef.current = false;
        setStatus(status);
      });
    } else if (!isAuthenticated) {
      identifyingRef.current = false;
      resetRevenueCatUser();
      resetSubscription();
    }
  }, [isAuthenticated, user?.id]);

  // ── Keep access in step with the backend's PRO flag ─────────────────────
  // A PRO grant that doesn't come from RevenueCat (admin panel, webhook) only changes the
  // server's record. Recompute access whenever the profile's subscription changes, and
  // re-fetch the profile when the app returns to the foreground so a grant made while the
  // user is signed in applies without a restart or re-login.
  useEffect(() => {
    if (isAuthenticated) syncBackendSubscription();
  }, [user?.subscription]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshSubscription = async () => {
      try {
        const response = await api.getMe();
        if (!response.success || !response.data?.user) return;
        const subscription = response.data.user.subscription === 'PRO' ? 'PRO' : 'FREE';
        if (subscription !== useAuthStore.getState().user?.subscription) {
          useAuthStore.getState().updateUser({ subscription, isPro: subscription === 'PRO' });
        }
      } catch {
        // Offline or a transient error — keep what we have
      }
    };

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshSubscription();
    });
    return () => subscription.remove();
  }, [isAuthenticated]);

  // ── Initialize auth + onboarding ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  // ── Has the first-launch language screen been dealt with? ────────────────
  // null until read, so the first frame never flashes the wrong start screen. Anyone who is
  // signed in counts as done (a later sign-out must not show the screen to an existing user),
  // and the flag is re-read on every auth change so finishing the screen then signing out in
  // the same session doesn't bring it back.
  const [languageChosen, setLanguageChosen] = useState<boolean | null>(null);
  useEffect(() => {
    if (isAuthenticated) {
      markLanguageChosen().then(() => setLanguageChosen(true));
    } else {
      hasChosenLanguage().then(setLanguageChosen);
    }
  }, [isAuthenticated]);

  if (!isInitialized || languageChosen === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.slate[900]} />
      </View>
    );
  }

  const needsSignupCompletion =
    isAuthenticated && (needsProfileSetup || user?.hasCompletedSignup === false);

  const navKey = !isAuthenticated ? 'auth' : needsSignupCompletion ? 'signup' : 'main';

  return (
    <NavigationContainer key={navKey} ref={navigationRef} linking={linking}>
      {!isAuthenticated ? (
        <AuthNavigator initialRouteName={getAuthStartRoute({ languageChosen })} />
      ) : needsSignupCompletion ? (
        <AuthNavigator
          initialRouteName={
            isFirstTimeUser && authMethod === 'email' ? 'Name' : 'ProfessionalDeclaration'
          }
        />
      ) : (
        <MainStackNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});
