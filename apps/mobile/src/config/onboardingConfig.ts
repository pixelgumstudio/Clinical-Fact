import { OnboardingStep } from '../store/onboardingStore';

export interface OnboardingStepConfig {
  id: OnboardingStep;
  /** Translation keys, resolved when the tooltip is shown so the tour follows the app language. */
  headingKey: string;
  descriptionKey: string;
  targetTab?: 'Home' | 'Library' | 'Chat' | 'Profile';
  tooltipPosition?: 'top' | 'bottom';
  /** Override the default padding offset so the tooltip appears near the relevant UI element */
  tooltipOffset?: number;
}

// The tour starts on Chat — new users land there right after signup, so the first step
// shouldn't move them away — and the overlay returns them to Chat when it ends.
export const onboardingSteps: OnboardingStepConfig[] = [
  {
    id: 'chats',
    headingKey: 'onboardingTour.chats.heading',
    descriptionKey: 'onboardingTour.chats.description',
    targetTab: 'Chat',
    tooltipPosition: 'bottom',
    tooltipOffset: 120,
  },
  {
    id: 'profile-welcome',
    headingKey: 'onboardingTour.profileWelcome.heading',
    descriptionKey: 'onboardingTour.profileWelcome.description',
    targetTab: 'Home',
    tooltipPosition: 'top',
    tooltipOffset: 90, // just below the header/logo row
  },
  {
    id: 'create-notes',
    headingKey: 'onboardingTour.createNotes.heading',
    descriptionKey: 'onboardingTour.createNotes.description',
    targetTab: 'Home',
    tooltipPosition: 'top',
    tooltipOffset: 210, // below the "Create Notes" feature card
  },
  {
    id: 'change-language',
    headingKey: 'onboardingTour.changeLanguage.heading',
    descriptionKey: 'onboardingTour.changeLanguage.description',
    targetTab: 'Home',
    tooltipPosition: 'top',
    tooltipOffset: 90, // near the language selector in the header
  },
  {
    id: 'manage-home',
    headingKey: 'onboardingTour.manageHome.heading',
    descriptionKey: 'onboardingTour.manageHome.description',
    targetTab: 'Home',
    tooltipPosition: 'bottom',
    tooltipOffset: 120, // above the tab bar, pointing at the notes list
  },
  {
    id: 'your-library',
    headingKey: 'onboardingTour.yourLibrary.heading',
    descriptionKey: 'onboardingTour.yourLibrary.description',
    targetTab: 'Library',
    tooltipPosition: 'bottom',
    tooltipOffset: 120,
  },
  {
    id: 'your-profile',
    headingKey: 'onboardingTour.yourProfile.heading',
    descriptionKey: 'onboardingTour.yourProfile.description',
    targetTab: 'Profile',
    tooltipPosition: 'bottom',
    tooltipOffset: 120,
  },
];
