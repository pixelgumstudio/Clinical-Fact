import { useEffect, useRef } from 'react';
import type { View } from 'react-native';
import { registerWalkthroughTarget, WalkthroughTargetId } from '../services/walkthroughTargets';

/** Put the returned ref on the view the walkthrough should be able to highlight. */
export function useWalkthroughTarget(id: WalkthroughTargetId) {
  const ref = useRef<View>(null);
  useEffect(() => registerWalkthroughTarget(id, ref), [id]);
  return ref;
}
