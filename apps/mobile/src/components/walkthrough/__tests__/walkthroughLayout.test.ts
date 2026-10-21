import { WALKTHROUGH_STEPS } from '../../../config/walkthroughSteps';
import type { Rect, WalkthroughTargetId } from '../../../services/walkthroughTargets';
import { CARD_GAP, computeWalkthroughLayout, SCREEN_MARGIN } from '../walkthroughLayout';

const CARD_W = 277;

// Plausible window rects for the six targets on a phone of the given size.
const targetsFor = (w: number, h: number): Record<WalkthroughTargetId, Rect> => {
  const tabW = (w - 46) / 5;
  const tabY = h - 83;
  return {
    chatInput: { x: 16, y: h - 260, width: w - 32, height: 190 },
    chatPlus: { x: 28, y: h - 150, width: 44, height: 44 },
    chatHeader: { x: 16, y: 60, width: 200, height: 44 },
    tabHome: { x: 23, y: tabY, width: tabW, height: 52 },
    tabQuiz: { x: 23 + tabW, y: tabY, width: tabW, height: 52 },
    tabFlashcards: { x: 23 + tabW * 3, y: tabY, width: tabW, height: 52 },
  };
};

const SCREENS = [
  { name: 'iPhone 15', width: 393, height: 852 },
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'large Android', width: 412, height: 915 },
];

describe.each(SCREENS)('walkthrough layout on $name', (screen) => {
  const rects = targetsFor(screen.width, screen.height);

  test.each(WALKTHROUGH_STEPS.map((s) => [s.id, s] as const))('%s: cut-out surrounds its target and the card fits without covering it', (_id, step) => {
    const rect = rects[step.target];
    const { hole, card } = computeWalkthroughLayout({
      rect, target: step.target, isTab: !!step.tab, placement: step.placement, screen, cardWidth: CARD_W,
    });

    // The lit-up area contains the target.
    expect(hole.x).toBeLessThanOrEqual(rect.x);
    expect(hole.y).toBeLessThanOrEqual(rect.y);
    expect(hole.x + hole.w).toBeGreaterThanOrEqual(rect.x + rect.width);
    expect(hole.y + hole.h).toBeGreaterThanOrEqual(rect.y + rect.height);

    // The card stays on screen horizontally.
    expect(card.left).toBeGreaterThanOrEqual(SCREEN_MARGIN);
    expect(card.left + CARD_W).toBeLessThanOrEqual(screen.width - SCREEN_MARGIN);

    // And sits clear of the cut-out, on the side it chose.
    if (card.placement === 'above') {
      expect(screen.height - card.bottom!).toBeLessThanOrEqual(hole.y - CARD_GAP + 0.001);
    } else {
      expect(card.top!).toBeGreaterThanOrEqual(hole.y + hole.h + CARD_GAP - 0.001);
    }
  });
});

describe('placement', () => {
  const screen = { width: 393, height: 852 };

  test('tabs get the card above them, the header gets it below', () => {
    const r = targetsFor(screen.width, screen.height);
    expect(computeWalkthroughLayout({ rect: r.tabQuiz, target: 'tabQuiz', isTab: true, placement: 'above', screen, cardWidth: CARD_W }).card.placement).toBe('above');
    expect(computeWalkthroughLayout({ rect: r.chatHeader, target: 'chatHeader', isTab: false, placement: 'below', screen, cardWidth: CARD_W }).card.placement).toBe('below');
  });

  test('flips to the other side when there is no room', () => {
    const nearTop: Rect = { x: 16, y: 70, width: 200, height: 44 };
    expect(computeWalkthroughLayout({ rect: nearTop, target: 'chatHeader', isTab: false, placement: 'above', screen, cardWidth: CARD_W }).card.placement).toBe('below');
    const nearBottom: Rect = { x: 16, y: 780, width: 200, height: 44 };
    expect(computeWalkthroughLayout({ rect: nearBottom, target: 'chatHeader', isTab: false, placement: 'below', screen, cardWidth: CARD_W }).card.placement).toBe('above');
  });

  test('card lines up with the input but centres on a tab', () => {
    const r = targetsFor(screen.width, screen.height);
    const input = computeWalkthroughLayout({ rect: r.chatInput, target: 'chatInput', isTab: false, placement: 'above', screen, cardWidth: CARD_W });
    expect(input.card.left).toBe(Math.max(r.chatInput.x - 4, SCREEN_MARGIN));
    const tab = computeWalkthroughLayout({ rect: r.tabHome, target: 'tabHome', isTab: true, placement: 'above', screen, cardWidth: CARD_W });
    expect(tab.card.left).toBe(SCREEN_MARGIN); // centred card would overflow the left edge, so it is clamped
  });
});
