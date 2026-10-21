import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nManager, Keyboard, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Icon, theme } from '@clinicalfact/design-system';
import { useTranslation } from 'react-i18next';
import { WALKTHROUGH_STEPS } from '../../config/walkthroughSteps';
import { measureWalkthroughTarget, Rect } from '../../services/walkthroughTargets';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { WALKTHROUGH_CARD_WIDTH, WalkthroughCard } from './WalkthroughCard';
import { computeWalkthroughLayout } from './walkthroughLayout';

const START_DELAY_MS = 900; // let the Chat screen finish laying out so its targets can be measured
const MEASURE_RETRIES = 8;
const MEASURE_RETRY_MS = 120;
const DIM = `${theme.colors.yale[900]}73`; // the brand's darkest blue at ~45% opacity

const roundedRect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} ` +
  `H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;

/**
 * First-run tour: dims the screen, cuts a hole around the element being explained and shows a card
 * next to it. Runs while the account's `walkthroughPending` flag is set; finishing, skipping or
 * closing clears it on the server so it never shows again, on any device. Pro subscribers don't
 * see steps marked `hideForPro`.
 */
export const WalkthroughOverlay: React.FC = () => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const pending = useAuthStore((s) => s.user?.onboarding?.walkthroughPending === true);
  const completeOnboardingStep = useAuthStore((s) => s.completeOnboardingStep);
  const isPro = useSubscriptionStore((s) => s.hasAccess);

  const steps = useMemo(() => WALKTHROUGH_STEPS.filter((s) => !(s.hideForPro && isPro)), [isPro]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      Keyboard.dismiss();
      setStarted(true);
    }, START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  const finish = useCallback(() => completeOnboardingStep('walkthroughPending'), [completeOnboardingStep]);

  const step = steps[index];
  const isLast = index >= steps.length - 1;
  const advance = useCallback(() => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  }, [isLast, finish]);

  // Find the highlighted element for this step; if it never shows up, skip the step rather than strand the user.
  useEffect(() => {
    if (!started || !pending || !step) return;
    let cancelled = false;
    setRect(null);
    (async () => {
      for (let attempt = 0; attempt < MEASURE_RETRIES && !cancelled; attempt++) {
        const found = await measureWalkthroughTarget(step.target);
        if (cancelled) return;
        if (found) return setRect(found);
        await new Promise((resolve) => setTimeout(resolve, MEASURE_RETRY_MS));
      }
      if (!cancelled) advance();
    })();
    return () => {
      cancelled = true;
    };
  }, [started, pending, step?.id]);

  if (!pending || !started || !step || !rect) return null;

  const { hole, radius, card } = computeWalkthroughLayout({
    rect,
    target: step.target,
    isTab: !!step.tab,
    placement: step.placement,
    screen: { width, height },
    cardWidth: WALKTHROUGH_CARD_WIDTH,
  });
  // Positions are measured in physical window coordinates, but React Native swaps `left`/`right` in
  // right-to-left languages, so a physical x must be given as `right` there to land in the same place.
  const physicalX = (x: number) => (I18nManager.isRTL ? { right: x } : { left: x });
  const cardPosition = {
    ...physicalX(card.left),
    ...(card.top !== undefined ? { top: card.top } : { bottom: card.bottom }),
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={finish}>
      <View style={styles.root}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path
            fillRule="evenodd"
            fill={DIM}
            d={`M0,0 H${width} V${height} H0 Z ${roundedRect(hole.x, hole.y, hole.w, hole.h, radius)}`}
          />
        </Svg>

        {step.tab && (
          <View
            pointerEvents="none"
            style={[styles.tabHighlight, physicalX(hole.x), { top: hole.y, width: hole.w, height: hole.h, borderRadius: radius }]}
          >
            <Icon name={step.tab.icon} size={24} color={theme.colors.grey[600]} />
            <Text style={styles.tabLabel} numberOfLines={1}>
              {t(step.tab.labelKey)}
            </Text>
          </View>
        )}

        <View style={[styles.cardAnchor, cardPosition]}>
          <WalkthroughCard
            title={t(step.titleKey)}
            description={t(step.descriptionKey)}
            isLast={isLast}
            onNext={advance}
            onSkip={finish}
            onClose={finish}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cardAnchor: {
    position: 'absolute',
  },
  // The real tab, redrawn lifted out of the dimmed bar.
  tabHighlight: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    gap: 4,
  },
  // The highlighted tab reads as a white tile with its own icon and a bold dark label, so it is
  // obvious which tab the card is about while the rest of the bar stays dimmed.
  tabLabel: {
    ...theme.typography.textStyles.label2,
    fontFamily: theme.typography.fontFamily.interMedium,
    fontWeight: '500',
    color: theme.colors.grey[900],
  },
});
