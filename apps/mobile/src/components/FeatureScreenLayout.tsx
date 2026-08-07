import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Icon, theme } from '@clinicalfact/design-system';

export interface FeatureScreenLayoutProps {
  /** 0-1 fill fraction for the header progress bar. */
  progress: number;
  title: string;
  subtitle: string;
  continueLabel: string;
  onContinue: () => void;
  /** The screen-specific illustration/demo content, rendered above the title. */
  children: React.ReactNode;
}

// Confirmed 2026-07-29 — the "shared flow" screens (Transcribe/Chat/Quiz) use
// a multicolor gradient progress fill, distinct from the solid yale-700 fill
// on the 8-screen survey. Not a mismatch — two different confirmed sections.
const PROGRESS_GRADIENT: [string, string, ...string[]] = [
  '#CEF9D0', '#DCEEB9', '#FFB09C', '#EBE19F', '#F3DA93', '#F9C597',
];

/**
 * Shared chrome for the 3-screen post-survey feature showcase
 * (FeatureTranscribe → FeatureChat → FeatureQuiz). Each screen supplies its
 * own illustration via `children`; the back button, progress bar, title/
 * subtitle block, and Continue button are identical across all three.
 */
export const FeatureScreenLayout: React.FC<FeatureScreenLayoutProps> = ({
  progress,
  title,
  subtitle,
  continueLabel,
  onContinue,
  children,
}) => {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="backFill" size={24} color="#7F8783" />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={PROGRESS_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${clampedProgress * 100}%` }]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}

        <View style={styles.titleSection}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="primary" fullWidth onPress={onContinue}>
          {continueLabel}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[2], // 8
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: theme.borderRadius.full,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[6], // 24
    paddingBottom: theme.spacing[4],
  },
  titleSection: {
    gap: theme.spacing[2], // 8
    paddingVertical: theme.spacing[6], // 24
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[2], // 8
  },
});

export default FeatureScreenLayout;
