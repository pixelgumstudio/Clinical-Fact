import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OnboardingStep =
  | 'profile-welcome'
  | 'create-notes'
  | 'change-language'
  | 'manage-home'
  | 'your-library'
  | 'chats'
  | 'your-profile';

interface OnboardingState {
  // State
  hasCompletedOnboarding: boolean;
  isOnboardingActive: boolean;
  currentStep: number;
  totalSteps: number;
  // isLoading is true until the persisted snapshot has been rehydrated from
  // AsyncStorage. AppNavigator gates rendering behind this flag.
  isLoading: boolean;

  // Actions
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  setOnboardingComplete: () => void;
  // No-op kept for backward compatibility — persist handles hydration automatically.
  loadOnboardingStatus: () => void;
  resetOnboarding: () => void;
  setCurrentStep: (step: number) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      isOnboardingActive: false,
      currentStep: 0,
      totalSteps: 7,
      isLoading: true,

      startOnboarding: () =>
        set({ isOnboardingActive: true, currentStep: 0 }),

      nextStep: () => {
        const { currentStep, totalSteps } = get();
        if (currentStep < totalSteps - 1) {
          set({ currentStep: currentStep + 1 });
        } else {
          get().completeOnboarding();
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) set({ currentStep: currentStep - 1 });
      },

      skipOnboarding: () =>
        set({ isOnboardingActive: false, hasCompletedOnboarding: true, currentStep: 0 }),

      completeOnboarding: () =>
        set({ isOnboardingActive: false, hasCompletedOnboarding: true, currentStep: 0 }),

      setOnboardingComplete: () =>
        set({ hasCompletedOnboarding: true }),

      // persist rehydrates automatically — this is a no-op kept for backward compat.
      loadOnboardingStatus: () => {},

      resetOnboarding: () =>
        set({ isOnboardingActive: false, currentStep: 0, hasCompletedOnboarding: false }),

      setCurrentStep: (step) => {
        const { totalSteps } = get();
        if (step >= 0 && step < totalSteps) set({ currentStep: step });
      },
    }),
    {
      name: 'clinicfact-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the durable flags; isLoading and totalSteps are transient.
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isOnboardingActive: state.isOnboardingActive,
        currentStep: state.currentStep,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark loading complete once AsyncStorage has been read.
        if (state) state.isLoading = false;
      },
    }
  )
);
