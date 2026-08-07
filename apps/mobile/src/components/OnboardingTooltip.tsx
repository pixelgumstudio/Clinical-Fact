import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';

type TooltipPosition = 'top' | 'bottom';

interface OnboardingTooltipProps {
  visible: boolean;
  heading: string;
  description: string;
  isLastStep: boolean;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
  position?: TooltipPosition;
  tooltipOffset?: number;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  visible,
  heading,
  description,
  isLastStep,
  onNext,
  onSkip,
  onClose,
  position = 'top',
  tooltipOffset,
}) => {
  const positionStyle = position === 'top'
    ? { justifyContent: 'flex-start' as const, paddingTop: tooltipOffset ?? 115 }
    : { justifyContent: 'flex-end' as const, paddingBottom: tooltipOffset ?? 110 };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[styles.overlay, positionStyle]}
      >
        <View style={styles.card}>
          {/* Header: Title + Close */}
          <View style={styles.headerRow}>
            <Text style={styles.heading} numberOfLines={2}>
              {heading}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* Footer: Skip + Next/Done */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={onNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextText}>
                {isLastStep ? 'Done' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Overlay — dark blue-teal tint matching Figma credit overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 26, 39, 0.35)',
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },

  // Tooltip card — white, 277px, rounded-24, p-16, gap-24
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    width: 277,
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },

  // Title row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  // Title — SemiBold 16px, #1C1C1C, lineHeight 22
  heading: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1C',
    lineHeight: 22,
    letterSpacing: -0.16,
  },

  // Close — 24x24 circle, grey bg
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  closeIcon: {
    fontSize: 10,
    color: '#1C1C1C',
    fontWeight: '500',
    lineHeight: 14,
  },

  // Description — Regular 14px, #636363, lineHeight 20
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#636363',
    lineHeight: 20,
    letterSpacing: -0.28,
    marginTop: -8, // compensate for card gap to match Figma 16px between title and desc
  },

  // Footer row
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Skip — grey pill, #EBEBEB bg
  skipButton: {
    backgroundColor: '#EBEBEB',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1C1C1C',
    letterSpacing: -0.12,
  },

  // Next/Done — black pill
  nextButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nextText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.12,
  },
});
