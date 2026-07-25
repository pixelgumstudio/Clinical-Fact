import { OnboardingStep } from '../store/onboardingStore';

export interface OnboardingStepConfig {
  id: OnboardingStep;
  heading: string;
  description: string;
  targetTab?: 'Home' | 'Library' | 'Chat' | 'Profile';
  tooltipPosition?: 'top' | 'bottom';
  /** Override the default padding offset so the tooltip appears near the relevant UI element */
  tooltipOffset?: number;
}

export const onboardingSteps: OnboardingStepConfig[] = [
  {
    id: 'profile-welcome',
    heading: 'Welcome to your Profile',
    description:
      'This is your profile, tap here to make changes to your profile and your subscription status',
    targetTab: 'Home',
    tooltipPosition: 'top',
    tooltipOffset: 90, // just below the header/logo row
  },
  {
    id: 'create-notes',
    heading: 'Create note',
    description:
      'Create any type of note from anything: Recording, Audio, Video, Image, Text and youtube links',
    targetTab: 'Home',
    tooltipPosition: 'top',
    tooltipOffset: 210, // below the "Create Notes" feature card
  },
  {
    id: 'change-language',
    heading: 'Change language',
    description:
      'Change the language of your app from here to your desired language',
    targetTab: 'Home',
    tooltipPosition: 'top',
    tooltipOffset: 90, // near the language selector in the header
  },
  {
    id: 'manage-home',
    heading: 'Manage home',
    description: 'View all your notes created, See all your actions in one place',
    targetTab: 'Home',
    tooltipPosition: 'bottom',
    tooltipOffset: 120, // above the tab bar, pointing at the notes list
  },
  {
    id: 'your-library',
    heading: 'Your library',
    description:
      'Manage all your notes created, Create folders for your notes and more',
    targetTab: 'Library',
    tooltipPosition: 'bottom',
    tooltipOffset: 120,
  },
  {
    id: 'chats',
    heading: 'Chats',
    description: 'Chat with any notes, Documents or PDF all in one place',
    targetTab: 'Chat',
    tooltipPosition: 'bottom',
    tooltipOffset: 120,
  },
  {
    id: 'your-profile',
    heading: 'Your profile',
    description:
      'View everything about your profile and edit settings for your profile from here',
    targetTab: 'Profile',
    tooltipPosition: 'bottom',
    tooltipOffset: 120,
  },
];
