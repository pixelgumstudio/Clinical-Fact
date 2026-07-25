import React, { useState } from 'react';
import { TooltipOverlay, TooltipConfig } from './TooltipOverlay';
import { useOnboardingStore } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';

// Define onboarding steps based on design specifications
const ONBOARDING_STEPS: TooltipConfig[] = [
  {
    id: '1',
    title: 'Welcome to your Profile',
    description: 'This is your profile, tap here to make changes to your profile and your subscription status.',
    tooltipPosition: 'center',
  },
  {
    id: '2',
    title: 'Create notes',
    description: 'Create Notes, quizzes, Flashcards and more to help you learn faster.',
    tooltipPosition: 'top',
    // Highlight area will be calculated dynamically or left empty for center tooltip
  },
  {
    id: '3',
    title: 'Manage home',
    description: 'View all your notes created. See all your actions in one place.',
    tooltipPosition: 'bottom',
  },
  {
    id: '4',
    title: 'Your library',
    description: 'Manage all your notes created. Create folders for your notes and more.',
    tooltipPosition: 'center',
  },
  {
    id: '5',
    title: 'Chats',
    description: 'Chat with any Notes, Documents or PDF all in one place.',
    tooltipPosition: 'center',
  },
];

export const OnboardingModal = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { setOnboardingComplete, hasCompletedOnboarding } = useOnboardingStore();
  const { user } = useAuthStore();

  // Don't show if onboarding is complete
  if (hasCompletedOnboarding) {
    return null;
  }

  const handleNext = async () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await setOnboardingComplete();
    }
  };

  const handleSkip = async () => {
    await setOnboardingComplete();
  };

  // Personalize the config with user's name if applicable
  const getCurrentConfig = (): TooltipConfig => {
    const config = ONBOARDING_STEPS[currentStep];
    if (currentStep === 0 && user?.name) {
      const firstName = user.name.split(' ')[0];
      return {
        ...config,
        title: `Welcome, ${firstName}!`,
      };
    }
    return config;
  };

  return (
    <TooltipOverlay
      visible={!hasCompletedOnboarding}
      config={getCurrentConfig()}
      currentStep={currentStep}
      totalSteps={ONBOARDING_STEPS.length}
      onNext={handleNext}
      onSkip={handleSkip}
      showSkip={true}
    />
  );
};
