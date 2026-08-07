import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Button, OptionCard, Icon, theme } from '@clinicalfact/design-system';

export interface SurveyOption {
  id: string;
  label: string;
}

export interface SurveyQuestionScreenProps {
  title: string;
  options: SurveyOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
  /** 1-indexed position in the overall survey */
  step: number;
  totalSteps: number;
}

/**
 * Shared layout for the 8-screen onboarding survey (confirmed 2026-07-30).
 * Every one of the 8 screens is visually identical — back button, progress
 * bar, Lora title, single-select OptionCard list, Continue button — so
 * they're built as thin data-only wrappers around this one component rather
 * than duplicating the layout 8 times.
 *
 * The source export hardcoded the exact same progress-bar fill width on
 * every one of the 8 screens (a Figma mockup artifact — the frame was
 * duplicated without updating it per step), so this computes a real
 * step/totalSteps fill instead of reproducing that static value.
 */
export const SurveyQuestionScreen: React.FC<SurveyQuestionScreenProps> = ({
  title,
  options,
  selectedId,
  onSelect,
  onContinue,
  step,
  totalSteps,
}) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const progress = Math.min(Math.max(step / totalSteps, 0), 1);

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
      </View>

      <View style={styles.content}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.title}>{title}</Text>

        <View style={styles.options}>
          {options.map((option) => (
            <OptionCard
              key={option.id}
              label={option.label}
              selected={selectedId === option.id}
              onPress={() => onSelect(option.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button variant="primary" fullWidth onPress={onContinue} disabled={!selectedId}>
          {t('auth.buttons.continue')}
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
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[4], // 16
    gap: theme.spacing[6], // 24
  },
  progressTrack: {
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
  },
  options: {
    gap: theme.spacing[4], // 16
  },
  footer: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[4], // 16
  },
});

export default SurveyQuestionScreen;
