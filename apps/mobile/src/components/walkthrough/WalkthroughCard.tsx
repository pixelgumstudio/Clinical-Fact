import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, theme } from '@clinicalfact/design-system';
import { useTranslation } from 'react-i18next';

export const WALKTHROUGH_CARD_WIDTH = 277;

interface WalkthroughCardProps {
  title: string;
  description: string;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
}

/** One walkthrough step's card: title and close, description, then Skip and Next/Finish. */
export const WalkthroughCard: React.FC<WalkthroughCardProps> = ({ title, description, isLast, onNext, onSkip, onClose }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Icon name="close" size={12} color={theme.colors.grey[300]} />
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>{t('walkthrough.skip')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.8}>
          <Text style={styles.nextText}>{isLast ? t('walkthrough.finish') : t('walkthrough.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: WALKTHROUGH_CARD_WIDTH,
    padding: theme.spacing[4], // 16
    gap: theme.spacing[6], // 24
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'], // 24
    ...theme.shadows.md,
  },
  textBlock: {
    gap: theme.spacing[4], // 16
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[2], // 8
  },
  title: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.grey[900],
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.grey[50],
  },
  description: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.grey[600],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    padding: theme.spacing[2], // 8
    paddingHorizontal: 12, // 8 + the 4 of inner padding in the design
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.linen[100],
    borderWidth: 1,
    borderColor: theme.colors.linen[400],
  },
  skipText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.grey[900],
  },
  nextButton: {
    padding: theme.spacing[2], // 8
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    borderWidth: 1,
    borderColor: theme.colors.yale[700],
  },
  nextText: {
    fontFamily: theme.typography.fontFamily.interMedium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.white,
  },
});
