// apps/mobile/src/components/TabletContainer.tsx
import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { theme } from '@clinicalfact/design-system';

// Every screen in this app was designed for phone-width layouts (onboarding
// mockup art sized to iPhone dimensions, absolute-positioned text blocks,
// hand-tuned pixel spacing). Rather than stretching that phone UI across a
// much wider iPad canvas — where it renders tiny, off-center, and floating —
// we pin the whole app to its designed max width and center it, the same
// "phone card on a tablet" treatment used by Instagram, TikTok, etc.
const MAX_CONTENT_WIDTH = 430; // widest current iPhone (Pro Max) point width

interface TabletContainerProps {
  children: React.ReactNode;
}

export const TabletContainer = ({ children }: TabletContainerProps) => {
  const { width } = useWindowDimensions();
  const isTablet = Platform.OS === 'ios' ? Platform.isPad : width >= 768;

  if (!isTablet) {
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
