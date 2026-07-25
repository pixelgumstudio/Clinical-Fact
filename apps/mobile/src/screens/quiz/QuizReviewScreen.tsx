// QuizReviewScreen.tsx - Original design with full options and explanations

import React, { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { handleExportFile, selectExportFormat } from '../../utils/exportUtil';

type QuizReviewRouteProp = RouteProp<MainStackParamList, 'QuizReview'>;
type QuizReviewNavigationProp = NativeStackNavigationProp<MainStackParamList, 'QuizReview'>;

interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: string;
}

export const QuizReviewScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<QuizReviewNavigationProp>();
  const route = useRoute<QuizReviewRouteProp>();
  const { noteId, noteTitle, answers, questions, quizId, title, mode } = route.params || {};

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<QuizQuestion[]>(
    (questions || []).map((q: any) => ({
      ...q,
      questionText: q.questionText || q.question || '',
    }))
  );
  const [parsedAnswers, setParsedAnswers] = useState<Record<string, string>>(answers || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch quiz data when in review mode and questions not provided
  useEffect(() => {
    if (mode === 'review' && quizId && (!questions || questions.length === 0)) {
      fetchQuizData();
    }
  }, [mode, quizId, questions]);

  const fetchQuizData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!quizId) {
        setError('Quiz ID is not available');
        console.warn('fetchQuizData: No quizId provided');
        setIsLoading(false);
        return;
      }

      console.log('fetchQuizData: Fetching quiz with ID:', quizId);
      const response = await api.getQuizById(quizId);
      console.log('fetchQuizData: API response:', response);

      if (response?.success && response?.data) {
        const quiz = response.data;
        console.log('Quiz data received:', quiz);

        // Parse questions from the quiz data
        let questionsData: any[] = [];
        if (quiz.questions && Array.isArray(quiz.questions)) {
          questionsData = quiz.questions;
        } else if (quiz.quiz?.questions && Array.isArray(quiz.quiz.questions)) {
          questionsData = quiz.quiz.questions;
        }

        if (questionsData.length > 0) {
          const transformed = questionsData.map((q: any) => ({
            id: q.id || q._id || '',
            questionText: q.questionText || q.question || '',
            options: q.options || [],
            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
            explanation: q.explanation || '',
            difficulty: q.difficulty || 'medium',
          }));
          console.log('Transformed questions:', transformed);
          setParsedQuestions(transformed);
        } else {
          console.warn('No questions found in response');
          setError('No questions found in quiz data');
        }

        // Parse answers from quiz history/submission data.
        // Backend stores userAnswers as a positional array [selectedIndex, ...] keyed by question position.
        // QuizReviewScreen expects Record<questionId, optionIndexString> where questionId = "question-N".
        let answersData: Record<string, string> = {};
        if (Array.isArray(quiz.userAnswers)) {
          quiz.userAnswers.forEach((answer: number, index: number) => {
            if (answer !== undefined && answer !== null && answer >= 0) {
              answersData[`question-${index}`] = String(answer);
            }
          });
        } else if (quiz.userAnswers && typeof quiz.userAnswers === 'object') {
          answersData = quiz.userAnswers;
        }
        console.log('Parsed answers:', answersData);
        setParsedAnswers(answersData);
      } else {
        const errorMsg = 'Failed to load quiz data - invalid response format';
        console.error(errorMsg, response);
        setError(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load quiz data';
      console.error('Error fetching quiz data:', error);
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = parsedQuestions[currentQuestionIndex];
  const totalQuestions = parsedQuestions.length;
  const userAnswer = parsedAnswers[currentQuestion?.id];
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  // Use title from params if provided (review mode from history), otherwise use noteTitle
  const displayTitle = title || noteTitle;

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleGoToNotes = () => {
    if (mode === 'review') {
      // In review mode, just go back
      navigation.goBack();
    } else {
      // In quiz results mode, navigate to note
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'MainTabs' },
            { name: 'NoteDetail', params: { noteId, title: noteTitle } },
          ],
        })
      );
    }
  };

  const handleExportReview = async () => {
    if (!quizId) {
      Alert.alert('Export Not Available', 'Quiz ID is not available for this quiz. Please try again.');
      return;
    }

    try {
      setIsExporting(true);
      const format = await selectExportFormat();

      const blob = await api.exportQuizAnswers(quizId, format);

      await handleExportFile(blob, {
        title: `${noteTitle || 'Quiz'} - Review`,
        format,
        isAnswers: true,
      });
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.headerBackButton}>
            <ChevronLeftIcon size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{displayTitle || t('quiz.reportsCard')}</Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            {error || 'No content available'}
          </Text>
          <TouchableOpacity
            style={[styles.goToNotesButton, { marginTop: spacing[4] }]}
            onPress={handleGoBack}
          >
            <Text style={styles.goToNotesButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCorrect = String(userAnswer) === String(currentQuestion.correctAnswer);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerBackButton}>
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {displayTitle ? `${displayTitle.substring(0, 20)}...` : t('quiz.reportsCard')}
        </Text>
        <Text style={styles.headerPercentage}>{Math.round(progress)}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            // Handle both string and object options
            const optionText = typeof option === 'string' ? option : (option as any)?.text || String(option);
            const optionKey = String(index);
            const isUserOption = String(userAnswer) === optionKey;
            const isCorrectOption = String(currentQuestion.correctAnswer) === optionKey;

            let optionStyle: any = styles.option;
            let optionTextStyle: any = styles.optionText;
            let radioStyle: any = styles.radio;
            let radioInnerStyle: any = styles.radioInner;

            if (isCorrectOption) {
              optionStyle = [styles.option, styles.optionCorrect];
              radioStyle = [styles.radio, styles.radioCorrect];
              radioInnerStyle = [styles.radioInner, styles.radioInnerCorrect];
            } else if (isUserOption && !isCorrect) {
              optionStyle = [styles.option, styles.optionIncorrect];
              radioStyle = [styles.radio, styles.radioIncorrect];
              radioInnerStyle = [styles.radioInner, styles.radioInnerIncorrect];
            }

            return (
              <View key={index} style={optionStyle}>
                <View style={radioStyle}>
                  <View style={radioInnerStyle} />
                </View>
                <Text style={optionTextStyle} numberOfLines={2}>
                  {optionText}
                </Text>
                {isCorrectOption && <Text style={styles.correctBadge}>✓ Correct</Text>}
                {isUserOption && !isCorrect && <Text style={styles.incorrectBadge}>✗ Wrong</Text>}
              </View>
            );
          })}
        </View>

        {/* Explanation Card */}
        {currentQuestion.explanation && (
          <View style={styles.explanationCard}>
            <Text style={styles.explanationLabel}>Explanation</Text>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation and Footer */}
      <View style={styles.footer}>
        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            disabled={currentQuestionIndex === 0}
            onPress={handlePrevious}
            style={[
              styles.circleButton,
              currentQuestionIndex === 0 && styles.circleButtonDisabled,
            ]}
          >
            <Text style={[styles.buttonText, currentQuestionIndex === 0 && styles.buttonTextDisabled]}>
              ‹
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={currentQuestionIndex === totalQuestions - 1}
            onPress={handleNext}
            style={[
              styles.circleButton,
              currentQuestionIndex === totalQuestions - 1 && styles.circleButtonDisabled,
            ]}
          >
            <Text style={[styles.buttonText, currentQuestionIndex === totalQuestions - 1 && styles.buttonTextDisabled]}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* Go to Notes Button */}
        <TouchableOpacity
          style={styles.goToNotesButton}
          onPress={handleGoToNotes}
        >
          <Text style={styles.goToNotesButtonText}>Go to Notes</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackButton: {
    padding: spacing[1],
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginHorizontal: spacing[3],
    textAlign: 'center',
  },
  headerPercentage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.semibold,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.neutral[200],
    marginHorizontal: spacing[5],
    marginTop: spacing[2],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  questionContainer: {
    marginBottom: spacing[6],
  },
  questionText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    lineHeight: 28,
  },
  optionsContainer: {
    marginBottom: spacing[6],
    gap: spacing[3],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    gap: spacing[3],
  },
  optionCorrect: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  optionIncorrect: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 24,
  },
  radioCorrect: {
    borderColor: '#10B981',
  },
  radioIncorrect: {
    borderColor: '#EF4444',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  radioInnerCorrect: {
    backgroundColor: '#10B981',
  },
  radioInnerIncorrect: {
    backgroundColor: '#EF4444',
  },
  optionText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    lineHeight: 20,
  },
  correctBadge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#10B981',
  },
  incorrectBadge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#EF4444',
  },
  explanationCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: spacing[4],
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: spacing[4],
  },
  explanationLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  explanationText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    paddingBottom: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[6],
    marginBottom: spacing[4],
  },
  circleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.text.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  circleButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
  },
  buttonText: {
    color: colors.background.primary,
    fontSize: 28,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: colors.text.secondary,
  },
  goToNotesButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.neutral[200],
    borderRadius: 12,
    alignItems: 'center',
  },
  goToNotesButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    textAlign: 'center',
    marginHorizontal: spacing[4],
  },
});
