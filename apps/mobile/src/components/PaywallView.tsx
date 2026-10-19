import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import type { PurchasesOffering } from 'react-native-purchases';
import { colors } from '@clinicalfact/design-system';
import { PaywallOutcome } from '../services/paywallSession';

interface PaywallViewProps {
  offering: PurchasesOffering;
  /** Called once, with how the paywall ended. */
  onFinish: (outcome: PaywallOutcome) => void;
}

/** The RevenueCat paywall rendered as a normal full-page screen (not the native sheet/modal). */
export const PaywallView: React.FC<PaywallViewProps> = ({ offering, onFinish }) => {
  const finishedRef = useRef(false);
  const finish = (outcome: PaywallOutcome) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(outcome);
  };

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        style={styles.paywall}
        options={{ offering, displayCloseButton: true }}
        onPurchaseCompleted={() => finish('purchased')}
        onRestoreCompleted={() => finish('restored')}
        onPurchaseError={() => finish('error')}
        onDismiss={() => finish('cancelled')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  paywall: {
    flex: 1,
  },
});
