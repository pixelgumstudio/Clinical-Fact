import type { Rect, WalkthroughTargetId } from '../../services/walkthroughTargets';

export const SCREEN_MARGIN = 16;
export const CARD_GAP = 12;
/** Rough card height, used only to decide whether it fits above/below the target. */
export const CARD_HEIGHT_ESTIMATE = 190;
const SAFE_TOP = 56;
const SAFE_BOTTOM = 24;

// Targets that sit on one side of the screen read better with the card lined up to their edge
// than centred on them (the input, the "+" button, the header).
const ALIGN_TO_TARGET: ReadonlySet<WalkthroughTargetId> = new Set(['chatInput', 'chatPlus', 'chatHeader']);

export interface WalkthroughLayoutInput {
  rect: Rect;
  target: WalkthroughTargetId;
  isTab: boolean;
  placement: 'above' | 'below';
  screen: { width: number; height: number };
  cardWidth: number;
}

export interface WalkthroughLayout {
  /** The lit-up area, in window coordinates (physical, left to right regardless of language direction). */
  hole: { x: number; y: number; w: number; h: number };
  radius: number;
  card: { left: number; placement: 'above' | 'below'; top?: number; bottom?: number };
}

/** Where the cut-out and the card go for one step. Pure, so every step can be checked for any screen size. */
export function computeWalkthroughLayout({ rect, target, isTab, placement, screen, cardWidth }: WalkthroughLayoutInput): WalkthroughLayout {
  const pad = isTab ? 12 : 4; // tab tiles extend a little beyond the tab itself
  const hole = { x: rect.x - pad, y: rect.y - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 };
  const radius = Math.min(isTab ? 20 : 16, hole.h / 2, hole.w / 2);

  const maxLeft = screen.width - SCREEN_MARGIN - cardWidth;
  const clamp = (x: number) => Math.min(Math.max(x, SCREEN_MARGIN), maxLeft);
  const left = ALIGN_TO_TARGET.has(target) ? clamp(hole.x) : clamp(rect.x + rect.width / 2 - cardWidth / 2);

  // Flip to the other side when the card would run off the screen.
  const roomAbove = hole.y - CARD_GAP - SAFE_TOP;
  const roomBelow = screen.height - SAFE_BOTTOM - (hole.y + hole.h + CARD_GAP);
  let side = placement;
  if (side === 'above' && roomAbove < CARD_HEIGHT_ESTIMATE && roomBelow > roomAbove) side = 'below';
  if (side === 'below' && roomBelow < CARD_HEIGHT_ESTIMATE && roomAbove > roomBelow) side = 'above';

  return {
    hole,
    radius,
    card:
      side === 'above'
        ? { left, placement: side, bottom: screen.height - (hole.y - CARD_GAP) }
        : { left, placement: side, top: hole.y + hole.h + CARD_GAP },
  };
}
