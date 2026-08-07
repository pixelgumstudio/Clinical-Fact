import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, theme } from '@clinicalfact/design-system';
import { useSignupStore } from '../../store/signupStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

const SETUP_ITEMS: { label: string; icon: 'ai' | 'translate' | 'link'; color: string }[] = [
  { label: 'Setting up Medical research or research', icon: 'ai', color: theme.colors.yale[700] },
  { label: 'Setting up Quiz & Flashcards for study operations', icon: 'translate', color: theme.colors.orange[600] },
  { label: 'Setting up Evidence based answers with real citations', icon: 'link', color: theme.colors.green[600] },
  { label: 'Setting up medical license exam searches for research', icon: 'ai', color: theme.colors.red[600] },
];

const GRADIENT_COLORS: readonly [string, string, ...string[]] = [
  '#CEF9D0',
  '#DCEE89',
  '#FFB09C',
  '#EBE19F',
  '#F3DA93',
  '#F9C597',
];

export const SetupScreen = () => {
  const { data, resetSignup } = useSignupStore();
  const { setOnboardingComplete } = useAuthStore();

  const [completedItems, setCompletedItems] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isReady, setIsReady] = useState(false); // API complete + animation done

  const fillAnim = useRef(new Animated.Value(0)).current;

  // Start progress animation and API call on mount
  useEffect(() => {
    // Animate progress bar over 5 seconds
    Animated.timing(fillAnim, {
      toValue: 1,
      duration: 5000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Update percentage text every 100ms
    const percentInterval = setInterval(() => {
      fillAnim.addListener(({ value }) => {
        setProgressPercent(Math.round(value * 100));
      });
    }, 100);

    // Check off items progressively
    const itemTimers = SETUP_ITEMS.map((_, i) =>
      setTimeout(() => {
        setCompletedItems(i + 1);
      }, (i + 1) * 1200)
    );

    // API call + ready state after animation
    const apiTimer = setTimeout(async () => {
      try {
        const response = await api.completeSignup({
          goals: data.goals,
          contentTypes: data.contentTypes,
          reviewStyle: data.reviewStyle,
          frustrations: data.frustrations,
          referralSource: data.referralSource,
          name: `${data.firstName} ${data.lastName}`.trim(),
          username: data.username,
        });

        if (response.success) {
          setIsReady(true);
        } else {
          Alert.alert('Error', response.message || 'Failed to complete signup');
        }
      } catch (error: any) {
        console.error('Setup completion error:', error);
        Alert.alert('Error', 'Failed to complete setup. Please try again.');
      }
    }, 5500);

    return () => {
      clearInterval(percentInterval);
      fillAnim.removeAllListeners();
      itemTimers.forEach(clearTimeout);
      clearTimeout(apiTimer);
    };
  }, []);

  const handleContinue = () => {
    // DemoVideo is hidden from the flow for now (kept in the codebase to
    // return to later), so Setup itself now completes onboarding directly
    // instead of handing off to it.
    setOnboardingComplete();
    resetSignup();
  };

  const fillWidth = trackWidth > 0
    ? fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth] })
    : fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Premium badge */}
      <View style={styles.badgeSection}>
        <View style={styles.badge}>
          <Icon name="premium" size={40} color={theme.colors.white} />
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>
          Setting up your personalised{'\n'}workspace, {data.firstName}...
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View
          style={styles.progressTrack}
          onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
        </View>
        <Text style={styles.progressPercent}>{progressPercent}%</Text>
      </View>

      {/* Items Card */}
      <View style={styles.card}>
        {SETUP_ITEMS.map((item, index) => (
          <View key={item.label}>
            <View style={styles.cardRow}>
              <View style={[styles.itemIconWrap, { backgroundColor: theme.colors.linen[100] }]}>
                <Icon name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.cardRowText}>{item.label}</Text>
              {completedItems > index ? (
                <LinearGradient
                  colors={GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.3 }}
                  style={styles.checkCircle}
                >
                  <Text style={styles.checkMark}>✓</Text>
                </LinearGradient>
              ) : (
                <View style={styles.checkCircleEmpty} />
              )}
            </View>
            {index < SETUP_ITEMS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !isReady && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isReady}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  badgeSection: {
    alignItems: 'center',
    paddingTop: 24,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    borderWidth: 1.5,
    borderColor: theme.colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    letterSpacing: -0.48,
    lineHeight: 32,
    textAlign: 'center',
  },
  progressSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F9F9F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: theme.colors.yale[700],
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1C1C1C',
    letterSpacing: -0.28,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F9F9F9',
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#1C1C1C',
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  checkCircleEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  divider: {
    height: 1,
    backgroundColor: '#F9F9F9',
    marginHorizontal: 0,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  continueButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.35,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.16,
  },
});
