import type { IconName } from '@clinicalfact/design-system';
import type { WalkthroughTargetId } from '../services/walkthroughTargets';

export interface WalkthroughStep {
  id: string;
  target: WalkthroughTargetId;
  /** Translation keys, resolved when shown so the tour follows the app language. */
  titleKey: string;
  descriptionKey: string;
  /** Which side of the highlighted element the card sits on. */
  placement: 'above' | 'below';
  /** Tab steps redraw the real tab (its icon and label) lifted out of the dimmed bar. */
  tab?: { icon: IconName; labelKey: string };
  /** Not shown to Pro subscribers (e.g. "upgrade" copy). */
  hideForPro?: boolean;
}

// First-run tour on the Chat screen, in the order users meet things: the input, the "+" menu,
// the header, then the tabs. It never navigates; it only points.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  { id: 'medical-data', target: 'chatInput', titleKey: 'walkthrough.medicalData.title', descriptionKey: 'walkthrough.medicalData.description', placement: 'above' },
  { id: 'customize-chat', target: 'chatPlus', titleKey: 'walkthrough.customizeChat.title', descriptionKey: 'walkthrough.customizeChat.description', placement: 'above' },
  { id: 'profile', target: 'chatHeader', titleKey: 'walkthrough.profile.title', descriptionKey: 'walkthrough.profile.description', placement: 'below', hideForPro: true },
  { id: 'home', target: 'tabHome', titleKey: 'walkthrough.home.title', descriptionKey: 'walkthrough.home.description', placement: 'above', tab: { icon: 'chatFill', labelKey: 'navigation.mainTabNavigator.home' } },
  { id: 'quiz', target: 'tabQuiz', titleKey: 'walkthrough.quiz.title', descriptionKey: 'walkthrough.quiz.description', placement: 'above', tab: { icon: 'quizFill', labelKey: 'navigation.mainTabNavigator.quiz' } },
  { id: 'flashcards', target: 'tabFlashcards', titleKey: 'walkthrough.flashcards.title', descriptionKey: 'walkthrough.flashcards.description', placement: 'above', tab: { icon: 'flashcardsFill', labelKey: 'navigation.mainTabNavigator.flashcards' } },
];
