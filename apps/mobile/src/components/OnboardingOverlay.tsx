import React, { useEffect } from 'react';
import { useOnboardingStore } from '../store/onboardingStore';
import { onboardingSteps } from '../config/onboardingConfig';
import { OnboardingTooltip } from './OnboardingTooltip';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

type TabParamList = {
  Home: undefined;
  Library: undefined;
  Create: undefined;
  Chat: undefined;
  Profile: undefined;
};

export const OnboardingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const {
    isOnboardingActive,
    currentStep,
    nextStep,
    skipOnboarding,
    completeOnboarding,
  } = useOnboardingStore();

  // Onboarding is started by MainTabNavigator after status is loaded — no need to start here

  const currentStepConfig = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  // Navigate to the target tab for each step
  useEffect(() => {
    if (isOnboardingActive && currentStepConfig?.targetTab) {
      try {
        navigation.navigate(currentStepConfig.targetTab as any);
      } catch {
        // Navigation may not be ready yet — silently skip
      }
    }
  }, [currentStep, isOnboardingActive]);

  // However the tour ends, drop the user back on Chat so they can start using the app.
  const returnToChat = () => {
    try {
      navigation.navigate('Chat');
    } catch {
      // Navigation may not be ready — the user is simply left on the current tab
    }
  };

  const handleSkip = () => {
    skipOnboarding();
    returnToChat();
  };

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
      returnToChat();
    } else {
      nextStep();
    }
  };

  if (!isOnboardingActive || !currentStepConfig) {
    return null;
  }

  return (
    <OnboardingTooltip
      visible={isOnboardingActive}
      heading={t(currentStepConfig.headingKey)}
      description={t(currentStepConfig.descriptionKey)}
      isLastStep={isLastStep}
      onNext={handleNext}
      onSkip={handleSkip}
      onClose={handleSkip}
      position={currentStepConfig.tooltipPosition}
      tooltipOffset={currentStepConfig.tooltipOffset}
    />
  );
};
