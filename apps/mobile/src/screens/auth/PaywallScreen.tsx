import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSignupStore } from '../../store/signupStore';
import { useAuthStore } from '../../store/authStore';
import { showInAppPaywall } from '../../services/revenuecat';

export const PaywallScreen = () => {
  const { resetSignup } = useSignupStore();
  const { setOnboardingComplete } = useAuthStore();
  const hasPresentedRef = useRef(false);

  useEffect(() => {
    if (hasPresentedRef.current) return;
    hasPresentedRef.current = true;

    // Result (purchased, restored, cancelled, or already-entitled) doesn't
    // change what happens next — onboarding completes either way, and free
    // users will simply hit this same paywall again at their first gated
    // feature via useGatedFeature.
    showInAppPaywall().finally(() => {
      setOnboardingComplete();
      resetSignup();
    });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#111827" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
