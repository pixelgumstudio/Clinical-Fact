import type { RefObject } from 'react';
import type { View } from 'react-native';

export type WalkthroughTargetId = 'chatInput' | 'chatPlus' | 'chatHeader' | 'tabHome' | 'tabQuiz' | 'tabFlashcards';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The tour highlights elements that live in different screens and in the tab bar. Each one
// registers its view here under a fixed id, and the tour measures it only when a step needs it.
const targets = new Map<WalkthroughTargetId, RefObject<View | null>>();

export function registerWalkthroughTarget(id: WalkthroughTargetId, ref: RefObject<View | null>): () => void {
  targets.set(id, ref);
  return () => {
    if (targets.get(id) === ref) targets.delete(id);
  };
}

/** Where the target is on screen right now, or null if it isn't mounted or has no size yet. */
export function measureWalkthroughTarget(id: WalkthroughTargetId): Promise<Rect | null> {
  const view = targets.get(id)?.current;
  if (!view) return Promise.resolve(null);
  return new Promise((resolve) => {
    view.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
  });
}
