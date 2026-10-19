import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { PaywallView } from '../../components/PaywallView';
import { finishPaywallSession, getPaywallSession, PaywallOutcome } from '../../services/paywallSession';

/** Full-page paywall for the in-app gates (see showInAppPaywall) — a screen in the main stack, not a modal. */
export const PaywallFullScreen = () => {
  const navigation = useNavigation();
  const session = getPaywallSession();

  useEffect(() => {
    if (!session) navigation.goBack(); // nothing asked for this screen (e.g. restored after a restart)
    // Leaving by the back gesture or a hardware back press counts as closing the paywall.
    return () => finishPaywallSession('cancelled');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) return null;

  const handleFinish = (outcome: PaywallOutcome) => {
    finishPaywallSession(outcome);
    if (navigation.canGoBack()) navigation.goBack();
  };

  return <PaywallView offering={session.offering} onFinish={handleFinish} />;
};
