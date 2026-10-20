import en from '../../i18n/locales/en.json';
import { WALKTHROUGH_STEPS } from '../walkthroughSteps';

const lookup = (key: string): unknown => key.split('.').reduce<any>((node, part) => node?.[part], en);

describe('walkthrough steps', () => {
  test('every step has its title, description and tab label in the English strings', () => {
    for (const step of WALKTHROUGH_STEPS) {
      expect(typeof lookup(step.titleKey)).toBe('string');
      expect(typeof lookup(step.descriptionKey)).toBe('string');
      if (step.tab) expect(typeof lookup(step.tab.labelKey)).toBe('string');
    }
  });

  test('ids and targets are unique, and the order is input, +, header, then the three tabs', () => {
    expect(new Set(WALKTHROUGH_STEPS.map((s) => s.id)).size).toBe(WALKTHROUGH_STEPS.length);
    expect(WALKTHROUGH_STEPS.map((s) => s.target)).toEqual(['chatInput', 'chatPlus', 'chatHeader', 'tabHome', 'tabQuiz', 'tabFlashcards']);
  });

  test('only the profile/upgrade step is hidden from Pro users', () => {
    expect(WALKTHROUGH_STEPS.filter((s) => s.hideForPro).map((s) => s.id)).toEqual(['profile']);
  });
});
