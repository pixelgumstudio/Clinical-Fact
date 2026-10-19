import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import type { PurchasesOffering } from 'react-native-purchases';
import { useSignupStore } from '../../store/signupStore';
import { useAuthStore } from '../../store/authStore';
import { getPaywallOffering, hasProEntitlement } from '../../services/revenuecat';
import { PaywallView } from '../../components/PaywallView';
import { colors } from '@clinicalfact/design-system';

export const PaywallScreen = () => {
  const { resetSignup } = useSignupStore();
  const { setOnboardingComplete } = useAuthStore();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const completedRef = useRef(false);

  // Result (purchased, restored, cancelled, unavailable, or already-entitled) doesn't change what
  // happens next — onboarding completes either way, and free users will simply hit the paywall
  // again at their first gated feature via useGatedFeature.
  const complete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setOnboardingComplete();
    resetSignup();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await hasProEntitlement()) return complete();
        const found = await getPaywallOffering('Onboarding');
        if (cancelled) return;
        if (found) setOffering(found);
        else complete();
      } catch {
        complete();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The end-of-signup paywall is a full page of its own, shown inside the signup flow.
  if (offering) return <PaywallView offering={offering} onFinish={complete} />;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.slate[900]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});
