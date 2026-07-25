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
import { useSignupStore, GOAL_OPTIONS } from '../../store/signupStore';

type GoalsScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Goals'>;

const CURRENT_STEP = 1;
const TOTAL_STEPS = 4;

// Gradient from Figma: linear-gradient(98.04deg, #CEF9D0, #DCEEB9, #FFB09C, #ECE19F, #F3DA93, #F9C597)
const CHECKBOX_GRADIENT: [string, string, ...string[]] = [
  '#CEF9D0', '#DCEEB9', '#FFB09C', '#ECE19F', '#F3DA93', '#F9C597',
];

export const GoalsScreen = () => {
  const navigation = useNavigation<GoalsScreenNavigationProp>();
  const { data, toggleGoal } = useSignupStore();
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header: back arrow + segmented progress bar */}
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
            What do you use ClinicFact{'\n'}to help you with
            {data.firstName ? `, ${data.firstName}` : ''}?
          </Text>
          <Text style={styles.subtitle}>
            Select all that apply. We'll tailor the experience for you.
          </Text>
        </View>

        <View style={styles.optionsSection}>
          {GOAL_OPTIONS.map((option) => {
            const isSelected = data.goals.includes(option.id);

            const cardContent = (
              <>
                {/* Checkbox: 32×32 container, 19.2×19.2 indicator inside */}
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
                    onPress={() => toggleGoal(option.id)}
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
                onPress={() => toggleGoal(option.id)}
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
          style={[styles.continueButton, data.goals.length === 0 && styles.continueButtonDisabled]}
          onPress={() => navigation.navigate('ContentType')}
          disabled={data.goals.length === 0}
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

  // Card — unselected: #F9F9F9 bg, no border
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
  // Gradient wrapper acting as the border for selected cards
  gradientBorder: {
    borderRadius: 16,
    padding: 1.5,
    height: 56,
  },
  // Card — selected: white bg inside gradient border
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

  // Outer container: 32×32 circle — transparent unselected, white when selected
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

  // Inner indicator — selected: gradient 19.2×19.2
  checkboxIndicator: {
    width: 19.2,
    height: 19.2,
    borderRadius: 9.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Inner indicator — unselected: grey border only
  checkboxIndicatorEmpty: {
    width: 19.2,
    height: 19.2,
    borderRadius: 9.6,
    borderWidth: 1.5,
    borderColor: '#BFBFBF',
  },

  // Checkmark: black (per Figma Vector 1 border: solid #000000)
  checkmark: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 12,
  },

  // Label text
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
