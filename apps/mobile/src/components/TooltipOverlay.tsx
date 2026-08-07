import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { colors, spacing, typography, Button } from '@clinicalfact/design-system';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface TooltipConfig {
  id: string;
  title: string;
  description: string;
  // Position of the highlighted area
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Position of the tooltip content
  tooltipPosition: 'top' | 'bottom' | 'center';
}

interface TooltipOverlayProps {
  visible: boolean;
  config: TooltipConfig;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  showSkip?: boolean;
}

export const TooltipOverlay: React.FC<TooltipOverlayProps> = ({
  visible,
  config,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  showSkip = true,
}) => {
  const { highlightArea, tooltipPosition } = config;

  const getTooltipStyle = () => {
    if (tooltipPosition === 'top') {
      return {
        top: spacing[8],
      };
    } else if (tooltipPosition === 'bottom') {
      return {
        bottom: spacing[8],
      };
    } else {
      // center
      return {
        top: SCREEN_HEIGHT / 2 - 150,
      };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Semi-transparent overlay */}
        <View style={styles.overlay} />

        {/* Highlighted area cutout (if specified) */}
        {highlightArea && (
          <>
            {/* Top mask */}
            <View
              style={[
                styles.mask,
                {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: highlightArea.y,
                },
              ]}
            />
            {/* Left mask */}
            <View
              style={[
                styles.mask,
                {
                  top: highlightArea.y,
                  left: 0,
                  width: highlightArea.x,
                  height: highlightArea.height,
                },
              ]}
            />
            {/* Right mask */}
            <View
              style={[
                styles.mask,
                {
                  top: highlightArea.y,
                  left: highlightArea.x + highlightArea.width,
                  right: 0,
                  height: highlightArea.height,
                },
              ]}
            />
            {/* Bottom mask */}
            <View
              style={[
                styles.mask,
                {
                  top: highlightArea.y + highlightArea.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
            {/* Highlight border */}
            <View
              style={[
                styles.highlightBorder,
                {
                  top: highlightArea.y - 4,
                  left: highlightArea.x - 4,
                  width: highlightArea.width + 8,
                  height: highlightArea.height + 8,
                },
              ]}
            />
          </>
        )}

        {/* Tooltip content */}
        <View style={[styles.tooltipContainer, getTooltipStyle()]}>
          <View style={styles.tooltip}>
            {showSkip && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onSkip}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.description}>{config.description}</Text>

            {/* Progress dots */}
            <View style={styles.progressContainer}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>

            {/* Next button */}
            <Button
              variant="primary"
              size="large"
              fullWidth
              onPress={onNext}
            >
              {currentStep === totalSteps - 1 ? 'Get Started' : 'Next'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  mask: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlightBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#F97316',
    borderRadius: 12,
  },
  tooltipContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing[6],
    zIndex: 10,
  },
  tooltip: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing[6],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[2],
  },
  skipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.semibold,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing[6],
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
    gap: spacing[2],
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[300],
  },
  progressDotActive: {
    width: 24,
    backgroundColor: colors.neutral[900],
  },
});
