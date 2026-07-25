// QuizResultsScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  typography,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useQuizStore } from '../../store/quizStore';
import api from '../../services/api';
import { handleExportFile, selectExportFormat } from '../../utils/exportUtil';

type QuizResultsRouteProp = RouteProp<MainStackParamList, 'QuizResults'>;
type QuizResultsNavigationProp = NativeStackNavigationProp<MainStackParamList, 'QuizResults'>;

// Score Circle Component
const ScoreCircle = ({ percentage, size = 160, youScoredLabel }: { percentage: number; size?: number; youScoredLabel: string }) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
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
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F59E0B"
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
        <Text style={scoreCircleStyles.percentageText}>{percentage}%</Text>
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
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  percentageText: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text.primary,
  },
});

// Gradient Card Component
const StatCard = ({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'green' | 'yellow' | 'red' | 'blue';
}) => {
  const gradientColors = {
    green: ['#D1FAE5', '#FCD0D0'],
    yellow: ['#DBEAFE', '#D1FAE5'],
    red: ['#FEF3C7', '#D1FAE5'],
    blue: ['#DBEAFE', '#FCD0D0'],
  };

  const textColors = {
    green: '#047857',
    yellow: '#B45309',
    red: '#B91C1C',
    blue: '#1E40AF',
  };

  return (
    <LinearGradient
      colors={gradientColors[variant] as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={statCardStyles.container}
    >
      <Text style={[statCardStyles.label, { color: textColors[variant] }]}>{label}</Text>
      <Text style={[statCardStyles.value, { color: colors.text.primary }]}>{value}</Text>
    </LinearGradient>
  );
};

const statCardStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
  },
});

export const QuizResultsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<QuizResultsNavigationProp>();
  const route = useRoute<QuizResultsRouteProp>();
  const addQuizResult = useQuizStore((state) => state.addQuizResult);
  const [isExporting, setIsExporting] = useState(false);
  const {
    noteId,
    noteTitle,
    totalQuestions,
    correctAnswers,
    timeTaken,
    answers,
    questions,
    quizId,
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

  const handleQuizExport = async (type: 'questions' | 'answers') => {
    if (!quizId) {
      Alert.alert('Export Not Available', 'Quiz ID is not available for this quiz. Please try again.');
      return;
    }

    try {
      setIsExporting(true);
      const format = await selectExportFormat();

      const blob = type === 'questions'
        ? await api.exportQuizQuestions(quizId, format)
        : await api.exportQuizAnswers(quizId, format);

      await handleExportFile(blob, {
        title: noteTitle || 'Quiz',
        format,
        isAnswers: type === 'answers',
      });
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRetakeQuiz = () => {
    navigation.replace('Quiz', {
      noteId: noteId || '',
      noteTitle: noteTitle || '',
      questionCount: totalQuestions,
      timeInMinutes: 10,
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
          <ScoreCircle percentage={percentage} size={180} youScoredLabel={t('quiz.youScored')} />
        </View>

        {/* Export Buttons */}
        {quizId && (
          <View style={styles.exportButtonsContainer}>
            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonQuestions]}
              onPress={() => handleQuizExport('questions')}
              disabled={isExporting}
            >
              <Text style={styles.exportButtonText}>
                {isExporting ? 'Exporting...' : 'Export Questions'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonAnswers]}
              onPress={() => handleQuizExport('answers')}
              disabled={isExporting}
            >
              <Text style={styles.exportButtonText}>
                {isExporting ? 'Exporting...' : 'Export Answers'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              label={t('quiz.youScored')}
              value={`${correctAnswers ?? 0}/${totalQuestions ?? 0}`}
              variant="green"
            />
            <StatCard
              label={t('quiz.timeInSeconds')}
              value={formatTime(timeTaken ?? 0)}
              variant="yellow"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label={t('quiz.accuracy')}
              value={`${accuracy} %`}
              variant="red"
            />
            <StatCard
              label={t('quiz.grade')}
              value={getGrade(percentage)}
              variant="blue"
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
          <TouchableOpacity
            style={styles.notesButton}
            onPress={handleGoToNotes}
            activeOpacity={0.8}
          >
            <Text style={styles.notesButtonText}>{t('notes.goToNote')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.viewHistoryButton}
          onPress={() => {}}
          activeOpacity={0.8}
        >
          <Text style={styles.viewHistoryText}>View History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  scoreCircleContainer: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    gap: spacing[4],
    marginVertical: spacing[6],
    paddingHorizontal: spacing[4],
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: 12,
    gap: spacing[2],
    borderWidth: 1,
  },
  exportButtonQuestions: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.border.main,
  },
  exportButtonAnswers: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  exportButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  statsGrid: {
    gap: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    paddingBottom: spacing[8],
  },
  reviewButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  reviewButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  footerButtonsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  retakeButton: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  notesButton: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: 'center',
  },
  notesButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  viewHistoryButton: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  viewHistoryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
});
