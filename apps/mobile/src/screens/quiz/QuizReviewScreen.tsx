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
import { Icon, theme } from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';

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
  const { noteId, noteTitle, answers, questions, quizId, mode } = route.params || {};

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
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
    if (mode === 'review' && !noteId) {
      // In review mode with no note behind it (chat-sourced quiz), just go back
      navigation.goBack();
    } else if (mode === 'review') {
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.yale[700]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.headerBackButton}>
            <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('quiz.reportsCard')}</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            {error || 'No content available'}
          </Text>
          <TouchableOpacity
            style={[styles.goToNotesButton, { marginTop: theme.spacing[4] }]}
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
          <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('quiz.question')} {currentQuestionIndex + 1}</Text>
        <View style={styles.timerBadge}>
          <Text style={styles.timerBadgeText}>{Math.round(progress)}%</Text>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          {t('quiz.questionCount', { current: currentQuestionIndex + 1, total: totalQuestions })}
        </Text>
        <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            // Handle both string and object options
            const optionText = typeof option === 'string' ? option : (option as any)?.text || String(option);
            const optionKey = String(index);
            const isUserOption = String(userAnswer) === optionKey;
            const isCorrectOption = String(currentQuestion.correctAnswer) === optionKey;
            const isWrongUserOption = isUserOption && !isCorrect;

            return (
              <View key={index} style={styles.optionWrapper}>
                <View
                  style={[
                    styles.option,
                    isCorrectOption && styles.optionCorrect,
                    isWrongUserOption && styles.optionIncorrect,
                  ]}
                >
                  <Icon
                    name={isCorrectOption || isWrongUserOption ? 'sucessfulFill' : 'unsucessful'}
                    size={24}
                    color={isCorrectOption ? '#3D7A4E' : isWrongUserOption ? '#B0453A' : theme.colors.grey[200]}
                  />
                  <Text style={styles.optionText} numberOfLines={2}>
                    {optionText}
                  </Text>
                </View>
                {isCorrectOption && (
                  <View style={styles.correctBadge}>
                    <Text style={styles.badgeText}>{t('quiz.correctAnswer')}</Text>
                  </View>
                )}
                {isWrongUserOption && (
                  <View style={styles.incorrectBadge}>
                    <Text style={styles.badgeText}>{t('quiz.yourAnswer')}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Explanation Card */}
        {currentQuestion.explanation && (
          <View style={styles.explanationCard}>
            <Text style={styles.explanationLabel}>{t('quiz.explanation')}</Text>
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
              styles.navButton,
              currentQuestionIndex === 0 && styles.navButtonDisabled,
            ]}
          >
            <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={currentQuestionIndex === totalQuestions - 1}
            onPress={handleNext}
            style={[
              styles.navButton,
              currentQuestionIndex === totalQuestions - 1 && styles.navButtonDisabled,
            ]}
          >
            <Text style={[styles.navButtonText, currentQuestionIndex === totalQuestions - 1 && styles.navButtonTextDisabled]}>
              Next
            </Text>
          </TouchableOpacity>
        </View>

        {/* Go to Notes Button */}
        <TouchableOpacity
          style={styles.goToNotesButton}
          onPress={handleGoToNotes}
        >
          <Text style={styles.goToNotesButtonText}>
            {noteId ? t('notes.goToNote') : t('quiz.goToChats')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
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
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  headerBackButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.textStyles.p2,
    fontWeight: '500',
    color: theme.colors.grey[900],
  },
  timerBadge: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
  },
  timerBadgeText: {
    ...theme.typography.textStyles.caption1,
    fontWeight: '500',
    color: theme.colors.yale[700],
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    marginTop: theme.spacing[3],
  },
  progressText: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[900],
  },
  progressPercentage: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[900],
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: theme.colors.grey[10],
    marginHorizontal: theme.spacing[5],
    marginTop: theme.spacing[2],
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[6],
  },
  questionText: {
    ...theme.typography.textStyles.h7,
    fontFamily: theme.typography.fontFamily.lora,
    fontWeight: '500',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[6],
  },
  optionsContainer: {
    marginBottom: theme.spacing[6],
    gap: theme.spacing[4],
  },
  optionWrapper: {
    position: 'relative',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    backgroundColor: theme.colors.grey[10],
    gap: theme.spacing[2],
  },
  optionCorrect: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3D7A4E',
  },
  optionIncorrect: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#B0453A',
  },
  optionText: {
    flex: 1,
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[900],
  },
  correctBadge: {
    position: 'absolute',
    top: -10,
    right: theme.spacing[4],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    backgroundColor: '#307132',
    borderRadius: theme.spacing[2],
  },
  incorrectBadge: {
    position: 'absolute',
    top: -10,
    right: theme.spacing[4],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    backgroundColor: '#B0453A',
    borderRadius: theme.spacing[2],
  },
  badgeText: {
    ...theme.typography.textStyles.label2,
    color: '#FFFFFF',
  },
  explanationCard: {
    backgroundColor: theme.colors.linen[50],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    gap: theme.spacing[3],
  },
  explanationLabel: {
    ...theme.typography.textStyles.p2,
    fontWeight: '500',
    color: theme.colors.grey[900],
  },
  explanationText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
  },
  footer: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    paddingBottom: theme.spacing[6],
    gap: theme.spacing[6],
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    width: '48%',
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    ...theme.typography.textStyles.button2,
    color: theme.colors.grey[900],
  },
  navButtonTextDisabled: {
    color: theme.colors.grey[300],
  },
  goToNotesButton: {
    paddingVertical: theme.spacing[4],
    backgroundColor: theme.colors.yale[700],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  goToNotesButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
  errorText: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginHorizontal: theme.spacing[4],
  },
});
