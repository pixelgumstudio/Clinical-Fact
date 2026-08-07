import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainStackNavigator } from './MainStackNavigator';
import { navigationRef } from './navigationRef';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { useSignupStore } from '../store/signupStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import {
  configureRevenueCat,
  listenForSubscriptionChanges,
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from '../services/revenuecat';

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

  const { isLoading: onboardingLoading, loadOnboardingStatus } = useOnboardingStore();
  const { authMethod } = useSignupStore();
  const { setStatus, reset: resetSubscription } = useSubscriptionStore();

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

  // ── Initialize auth + onboarding ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = initialize();
    loadOnboardingStatus();
    return unsubscribe;
  }, []);

  if (onboardingLoading || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  const needsSignupCompletion =
    isAuthenticated && (needsProfileSetup || user?.hasCompletedSignup === false);

  const navKey = !isAuthenticated ? 'auth' : needsSignupCompletion ? 'signup' : 'main';

  return (
    <NavigationContainer key={navKey} ref={navigationRef} linking={linking}>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : needsSignupCompletion ? (
        <AuthNavigator
          initialRouteName={
            isFirstTimeUser && authMethod === 'email' ? 'Name' : 'Role'
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
    backgroundColor: '#FFFFFF',
  },
});
