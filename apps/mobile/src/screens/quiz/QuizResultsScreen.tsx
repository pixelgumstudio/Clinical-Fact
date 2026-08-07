// QuizResultsScreen.tsx

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { theme } from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useQuizStore } from '../../store/quizStore';

type QuizResultsRouteProp = RouteProp<MainStackParamList, 'QuizResults'>;
type QuizResultsNavigationProp = NativeStackNavigationProp<MainStackParamList, 'QuizResults'>;

// Score Circle Component
const ScoreCircle = ({ percentage, size = 200, youScoredLabel }: { percentage: number; size?: number; youScoredLabel: string }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  return (
    <View style={scoreCircleStyles.container}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.grey[10]}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.yale[700]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={scoreCircleStyles.labelContainer}>
        <Text style={scoreCircleStyles.labelText}>{youScoredLabel}</Text>
        <Text>
          <Text style={scoreCircleStyles.percentageText}>{percentage}</Text>
          <Text style={scoreCircleStyles.percentageSign}>%</Text>
        </Text>
      </View>
    </View>
  );
};

const scoreCircleStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  labelText: {
    ...theme.typography.textStyles.button3,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing[2],
  },
  percentageText: {
    fontSize: 48,
    lineHeight: 58,
    fontWeight: '600',
    color: theme.colors.yale[700],
  },
  percentageSign: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    color: theme.colors.yale[700],
  },
});

// Stat card matching the report card design (neutral card, no color variants)
const StatCard = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={statCardStyles.container}>
      <Text style={statCardStyles.label}>{label}</Text>
      <Text style={statCardStyles.value}>{value}</Text>
    </View>
  );
};

const statCardStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.linen[50],
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    alignItems: 'flex-start',
    gap: theme.spacing[8],
  },
  label: {
    ...theme.typography.textStyles.p2,
    fontWeight: '500',
    color: theme.colors.grey[600],
  },
  value: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '500',
    color: theme.colors.grey[900],
  },
});

export const QuizResultsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<QuizResultsNavigationProp>();
  const route = useRoute<QuizResultsRouteProp>();
  const addQuizResult = useQuizStore((state) => state.addQuizResult);
  const {
    noteId,
    noteTitle,
    totalQuestions,
    correctAnswers,
    timeTaken,
    answers,
    questions,
    quizId,
    chatTranscript,
    chatSessionId,
  } = route.params || {};

  // Save quiz result to store on mount
  React.useEffect(() => {
    if (noteId && totalQuestions && correctAnswers !== undefined) {
      addQuizResult({
        noteId,
        noteTitle: noteTitle || 'Untitled',
        totalQuestions: totalQuestions ?? 0,
        correctAnswers: correctAnswers ?? 0,
        timeTaken: timeTaken ?? 0,
        percentage: Math.round(((correctAnswers ?? 0) / (totalQuestions ?? 1)) * 100),
        grade: getGrade(Math.round(((correctAnswers ?? 0) / (totalQuestions ?? 1)) * 100)),
      });
    }
  }, [noteId, totalQuestions, correctAnswers, timeTaken, noteTitle, addQuizResult]);

  const percentage = Math.round(((correctAnswers ?? 0) / (totalQuestions ?? 1)) * 100);
  const accuracy = percentage;

  const getGrade = (percent: number) => {
    if (percent >= 90) return 'A+';
    if (percent >= 80) return 'A';
    if (percent >= 70) return 'B+';
    if (percent >= 60) return 'C+';
    if (percent >= 50) return 'C';
    if (percent >= 40) return 'D';
    return 'F';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleReviewAnswers = () => {
    navigation.navigate('QuizReview', {
      noteId,
      noteTitle,
      answers,
      questions,
      quizId,
    });
  };

  const handleRetakeQuiz = () => {
    navigation.replace('Quiz', {
      noteId,
      noteTitle: noteTitle || '',
      questionCount: totalQuestions,
      timeInMinutes: 10,
      chatTranscript,
      chatSessionId,
    });
  };

  const handleGoToNotes = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'MainTabs' },
          { name: 'NoteDetail', params: { noteId: noteId || '', title: noteTitle || '' } },
        ],
      })
    );
  };

  const handleGoToChats = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>{t('quiz.reportsCard')}</Text>

        {/* Score Circle */}
        <View style={styles.scoreCircleContainer}>
          <ScoreCircle percentage={percentage} size={200} youScoredLabel={t('quiz.youScored')} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              label={t('quiz.youScored')}
              value={`${correctAnswers ?? 0}/${totalQuestions ?? 0}`}
            />
            <StatCard
              label={t('quiz.timeInSeconds')}
              value={formatTime(timeTaken ?? 0)}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label={t('quiz.accuracy')}
              value={`${accuracy} %`}
            />
            <StatCard
              label={t('quiz.grade')}
              value={getGrade(percentage)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={handleReviewAnswers}
          activeOpacity={0.8}
        >
          <Text style={styles.reviewButtonText}>{t('quiz.reviewAnswers')}</Text>
        </TouchableOpacity>

        <View style={styles.footerButtonsRow}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetakeQuiz}
            activeOpacity={0.8}
          >
            <Text style={styles.retakeButtonText}>{t('quiz.retakeQuiz')}</Text>
          </TouchableOpacity>
          {noteId ? (
            <TouchableOpacity
              style={styles.notesButton}
              onPress={handleGoToNotes}
              activeOpacity={0.8}
            >
              <Text style={styles.notesButtonText}>{t('notes.goToNote')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.notesButton}
              onPress={handleGoToChats}
              activeOpacity={0.8}
            >
              <Text style={styles.notesButtonText}>{t('quiz.goToChats')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[6],
  },
  title: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing[6],
  },
  scoreCircleContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[8],
  },
  statsGrid: {
    gap: theme.spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing[4],
  },
  footer: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    paddingBottom: theme.spacing[8],
    gap: theme.spacing[6],
  },
  reviewButton: {
    backgroundColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  reviewButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
  footerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  retakeButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  retakeButtonText: {
    ...theme.typography.textStyles.button2,
    color: theme.colors.grey[900],
  },
  notesButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  notesButtonText: {
    ...theme.typography.textStyles.button2,
    color: theme.colors.grey[900],
  },
});
