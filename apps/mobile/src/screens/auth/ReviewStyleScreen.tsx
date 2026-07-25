import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, REVIEW_STYLE_OPTIONS } from '../../store/signupStore';

type ReviewStyleScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ReviewStyle'>;

const CURRENT_STEP = 3;
const TOTAL_STEPS = 4;

const CHECKBOX_GRADIENT: [string, string, ...string[]] = [
  '#CEF9D0', '#DCEEB9', '#FFB09C', '#ECE19F', '#F3DA93', '#F9C597',
];

export const ReviewStyleScreen = () => {
  const navigation = useNavigation<ReviewStyleScreenNavigationProp>();
  const { data, setReviewStyle } = useSignupStore();
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={CHECKBOX_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` }]}
          />
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            How do you like to review{'\n'}what you've learned
            {data.firstName ? `, ${data.firstName}` : ''}?
          </Text>
          <Text style={styles.subtitle}>
            Select your preferred review method.
          </Text>
        </View>

        <View style={styles.optionsSection}>
          {REVIEW_STYLE_OPTIONS.map((option) => {
            const isSelected = data.reviewStyle === option.id;

            const cardContent = (
              <>
                <View style={[styles.checkboxContainer, isSelected && styles.checkboxContainerSelected]}>
                  {isSelected ? (
                    <LinearGradient
                      colors={CHECKBOX_GRADIENT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0.3 }}
                      style={styles.checkboxIndicator}
                    >
                      <Text style={styles.checkmark}>✓</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.checkboxIndicatorEmpty} />
                  )}
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
              </>
            );

            if (isSelected) {
              return (
                <LinearGradient
                  key={option.id}
                  colors={CHECKBOX_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0.3 }}
                  style={styles.gradientBorder}
                >
                  <TouchableOpacity
                    style={styles.optionCardInner}
                    onPress={() => setReviewStyle(option.id)}
                    activeOpacity={0.75}
                  >
                    {cardContent}
                  </TouchableOpacity>
                </LinearGradient>
              );
            }

            return (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={() => setReviewStyle(option.id)}
                activeOpacity={0.75}
              >
                {cardContent}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !data.reviewStyle && styles.continueButtonDisabled]}
          onPress={() => navigation.navigate('Referral')}
          disabled={!data.reviewStyle}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F9F9F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  titleSection: {
    marginTop: 8,
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    letterSpacing: -0.48,
    lineHeight: 32,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#636363',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  optionsSection: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
  },
  gradientBorder: {
    borderRadius: 16,
    padding: 1.5,
    height: 56,
  },
  optionCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14.5,
  },
  checkboxContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxContainerSelected: {
    backgroundColor: '#FFFFFF',
  },
  checkboxIndicator: {
    width: 19.2,
    height: 19.2,
    borderRadius: 9.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxIndicatorEmpty: {
    width: 19.2,
    height: 19.2,
    borderRadius: 9.6,
    borderWidth: 1.5,
    borderColor: '#BFBFBF',
  },
  checkmark: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#1C1C1C',
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
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
