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

type FeatureQuizNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'FeatureQuiz'>;

const PROGRESS_GRADIENT: [string, string, ...string[]] = [
  '#CEF9D0', '#DCEEB9', '#FFB09C', '#ECE19F', '#F3DA93', '#F9C597',
];

const ANSWERS = [
  'Anterior cerebral artery',
  'Middle meningeal artery',
  'Internal carotid artery',
  'Basilar artery',
];

const SELECTED_INDEX = 1;

export const FeatureQuizScreen = () => {
  const navigation = useNavigation<FeatureQuizNavigationProp>();
  const canGoBack = navigation.canGoBack();

  return (
    <LinearGradient
      colors={['#E8F7F3', '#FFFFFF', '#FDF0E8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBg}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header row */}
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={PROGRESS_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressFill83}
            />
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question counter */}
          <Text style={styles.questionCounter}>Question 1 of 5</Text>

          {/* Question text */}
          <Text style={styles.questionText}>
            {'Which artery is most commonly injured\nin an epidural hematoma?'}
          </Text>

          {/* Answer options */}
          <View style={styles.answersContainer}>
            {ANSWERS.map((answer, index) => {
              const isSelected = index === SELECTED_INDEX;
              if (isSelected) {
                return (
                  <LinearGradient
                    key={index}
                    colors={['#F9F3A3', '#FFB09C', '#FDE68A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.answerSelected}
                  >
                    <View style={styles.selectedCircle}>
                      <Text style={styles.selectedCheck}>✓</Text>
                    </View>
                    <Text style={styles.answerTextSelected}>{answer}</Text>
                  </LinearGradient>
                );
              }
              return (
                <View key={index} style={styles.answerOption}>
                  <View style={styles.unselectedCircle} />
                  <Text style={styles.answerText}>{answer}</Text>
                </View>
              );
            })}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <LinearGradient
              colors={['#BBDEFB', '#F8BBD9', '#C8E6C9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCard}
            >
              <Text style={styles.statLabel}>YOU SCORED</Text>
              <Text style={styles.statValue}>3/15</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#B3E5FC', '#B2DFDB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCard}
            >
              <Text style={styles.statLabel}>TIME (IN SECONDS)</Text>
              <Text style={styles.statValue}>03:12</Text>
            </LinearGradient>
          </View>

          {/* Bottom text */}
          <View style={styles.bottomText}>
            <Text style={styles.bottomTitle}>{'Learn faster with Quiz &\nFlashcards'}</Text>
            <Text style={styles.bottomSubtitle}>
              {'Turn notes into quizzes and flashcards.\nLearn faster and retain more.'}
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('Thanks')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
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
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: '#1C1C1C',
    lineHeight: 28,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill83: {
    width: '83%',
    height: '100%',
    borderRadius: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  // Question
  questionCounter: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1C',
    lineHeight: 26,
    marginBottom: 20,
  },

  // Answers
  answersContainer: {
    gap: 10,
  },
  answerOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unselectedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#BFBFBF',
  },
  answerText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  answerSelected: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  answerTextSelected: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
    marginLeft: 12,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
  },
  statLabel: {
    fontSize: 11,
    color: '#374151',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1C',
  },

  // Bottom text
  bottomText: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  bottomTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1C',
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomSubtitle: {
    fontSize: 15,
    color: '#636363',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  continueButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
