// apps/mobile/src/components/TabletContainer.tsx
import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { theme } from '@clinicalfact/design-system';

// Every screen in this app was designed for phone-width layouts (onboarding
// mockup art sized to iPhone dimensions, absolute-positioned text blocks,
// hand-tuned pixel spacing). Rather than stretching that phone UI across a
// much wider tablet canvas — where it renders tiny, off-center, and floating —
// we pin the whole app to its designed max width and center it, the same
// "phone card on a tablet" treatment used by Instagram, TikTok, etc.
const MAX_CONTENT_WIDTH = 430; // widest current iPhone (Pro Max) point width
const TABLET_MIN_WIDTH = 768;

interface TabletContainerProps {
  children: React.ReactNode;
}

export const TabletContainer = ({ children }: TabletContainerProps) => {
  const { width } = useWindowDimensions();
  if (width < TABLET_MIN_WIDTH) {
    return <>{children}</>;
  }

  return (
    <View style={styles.outer}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.yale[900],
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
});

export default TabletContainer;
