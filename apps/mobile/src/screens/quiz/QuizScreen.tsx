import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  TimerIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { showInAppPaywall } from '../../services/revenuecat';
import { useAuthStore } from '../../store/authStore';
import { CustomAlertModal } from '../../components/CustomAlertModal';

type QuizScreenRouteProp = RouteProp<MainStackParamList, 'Quiz'>;
type QuizScreenNavigationProp = NativeStackNavigationProp<MainStackParamList, 'Quiz'>;

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
}

export const QuizScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<QuizScreenNavigationProp>();
  const route = useRoute<QuizScreenRouteProp>();
  const { noteId, noteTitle, questionCount = 5, timeInMinutes = 10 } = route.params || {};
  const { user } = useAuthStore();

  // State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(timeInMinutes * 60);
  const [isLoading, setIsLoading] = useState(true);
  const [simProgress, setSimProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [noteData, setNoteData] = useState<any>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quizIdRef = useRef<string>('');
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttonText: string;
  }>({ visible: false, title: '', message: '', buttonText: t('common.ok') });

  const closeAndGoBack = () => {
    setAlertConfig({ visible: false, title: '', message: '', buttonText: t('common.ok') });
    navigation.goBack();
  };

  const QUIZ_STATUSES = [
    t('quiz.reading'),
    t('quiz.identifying'),
    t('quiz.structuring'),
    t('quiz.almostReady'),
  ];

  // Derived state
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  // Fetch note data to get studyLanguage
  useEffect(() => {
    if (noteId) {
      api.getNoteById(noteId).then((res) => {
        if (res.success && res.data) {
          setNoteData(res.data);
        }
      }).catch((err) => {
        console.warn("Failed to fetch note data:", err);
      });
    }
  }, [noteId]);

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
  }, []);

  // Timer effect - starts only after questions are loaded
  useEffect(() => {
    if (isLoading || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, questions.length]); // Depend on loading state

  // Cycle status strings while loading
  useEffect(() => {
    if (!isLoading) { setStatusIndex(0); return; }
    const id = setInterval(() => setStatusIndex((i) => (i + 1) % QUIZ_STATUSES.length), 3000);
    return () => clearInterval(id);
  }, [isLoading]);

  // Simulated deterministic progress: 0→85% over 10s, then crawls to 95%, holds until API
  useEffect(() => {
    if (!isLoading) return;
    setSimProgress(0);
    const start = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const s = (Date.now() - start) / 1000;
      const p = s <= 10 ? (s / 10) * 85 : 85 + Math.min(10, ((s - 10) / 50) * 10);
      setSimProgress(Math.min(95, p));
    }, 100);
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isLoading]);

  const loadQuestions = async () => {
  try {
    setIsLoading(true);
    const effectiveLanguage = noteData?.studyLanguage ?? user?.studyLanguage ?? user?.preferredLanguage ?? 'en';
    const response = await api.generateQuiz(noteId, questionCount, 'medium', ['multiple-choice'], 'standard', effectiveLanguage);

    if (response.success && response.data && response.data.questions) {
      setQuestions(response.data.questions);
      quizIdRef.current = response.data._id || '';
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setSimProgress(100);
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
    } 
    // 🛡️ Handle Quota Exceeded in the response itself
    else if ((response as any).quotaExceeded === true || (response as any).status === 402) {
      navigation.goBack();
      setTimeout(() => {
        showInAppPaywall().catch(err => console.error("Paywall error:", err));
      }, 600);
    } 
    else {
      throw new Error(response.message || 'Generation failed');
    }
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    
    // 🛡️ The Backend Interceptor (Checking common Axios/Fetch error patterns)
    const statusCode = error.status || error.response?.status;
    const isQuotaError = statusCode === 402 || 
                        (error.message && error.message.includes('limit reached')) ||
                        (error.message && error.message.includes('Free trial'));

    if (isQuotaError) {
      navigation.goBack(); // Dismiss the loading screen
      setTimeout(() => {
        showInAppPaywall().catch(err => console.error("Paywall error:", err));
      }, 600);
      return;
    }

    setAlertConfig({
      visible: true,
      title: t('quiz.errorTitle'),
      message: t('quiz.errorMessage'),
      buttonText: t('common.ok'),
    });
  } finally {
    setIsLoading(false);
  }
};

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleGoBack = () => {
    Alert.alert(
      t('quiz.exitTitle'),
      t('quiz.exitMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('quiz.exit'), style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleSelectOption = (optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmit = useCallback(() => {
    let correctCount = 0;
    const indexedAnswers: Record<string, string> = {};
    const answersArray: number[] = [];

    questions.forEach((q, position) => {
      const selectedOptionId = selectedAnswers[q.id];
      const selectedIndex = q.options.findIndex((opt) => opt.id === selectedOptionId);

      if (selectedIndex >= 0) {
        indexedAnswers[q.id] = String(selectedIndex);
      }

      // answersArray is positional — backend expects answers[index] = selectedOptionIndex
      answersArray[position] = selectedIndex >= 0 ? selectedIndex : -1;

      if (selectedIndex === Number(q.correctAnswer)) {
        correctCount++;
      }
    });

    const timeTaken = timeInMinutes * 60 - timeRemaining;

    // Persist answers and score to backend (fire-and-forget; doesn't block navigation)
    if (quizIdRef.current) {
      api.submitQuiz(quizIdRef.current, answersArray).catch(err =>
        console.warn('submitQuiz failed:', err)
      );
    }

    navigation.replace('QuizResults', {
      noteId,
      noteTitle,
      totalQuestions,
      correctAnswers: correctCount,
      timeTaken,
      answers: indexedAnswers,
      questions,
      quizId: quizIdRef.current,
    });
  }, [selectedAnswers, questions, timeRemaining, navigation, noteId, noteTitle, timeInMinutes]);

  const selectedAnswer = currentQuestion ? selectedAnswers[currentQuestion.id] : null;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomAlertModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttonText={alertConfig.buttonText}
          onClose={closeAndGoBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.neutral[900]} />
          <Text style={styles.loadingText}>{t('quiz.generatingQuiz')}</Text>
          <Text style={styles.loadingStatus}>{QUIZ_STATUSES[statusIndex]}</Text>
          <View style={styles.simProgressBar}>
            <LinearGradient
              colors={['#F9C597', '#FFB09C', '#EBE19F', '#CEF9D0']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.simProgressFill, { width: `${simProgress}%` as any }]}
            />
          </View>
          <Text style={styles.simProgressPct}>{Math.round(simProgress)}%</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomAlertModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttonText={alertConfig.buttonText}
          onClose={closeAndGoBack}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('quiz.noQuestions')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText}
        onClose={closeAndGoBack}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.headerBackButton}>
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('quiz.question')} {currentQuestionIndex + 1}</Text>
        <View style={styles.timerContainer}>
          <TimerIcon size={18} color="#F59E0B" />
          <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
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
        <LinearGradient
          colors={['#F9C597', '#FFB09C', '#EBE19F', '#CEF9D0']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.progressBarFill, { width: `${progress}%` as any }]}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Question */}
        <Text style={styles.questionText}>{currentQuestion?.question}</Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion?.options.map((option, index) => {
            const isSelected = selectedAnswer === option.id;
            return (
              <TouchableOpacity
                key={`${option.id}-${index}`}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                ]}
                onPress={() => handleSelectOption(option.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioButton,
                    isSelected && styles.radioButtonSelected,
                  ]}
                />
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {option.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentQuestionIndex === 0 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextQuestion}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>{t('quiz.next')}</Text>
          </TouchableOpacity>
        ) : isLastQuestion ? (
          <View style={styles.footerButtonsRow}>
            <TouchableOpacity
              style={styles.previousButton}
              onPress={handlePreviousQuestion}
              activeOpacity={0.8}
            >
              <Text style={styles.previousButtonText}>{t('quiz.previous')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>{t('quiz.submit')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footerButtonsRow}>
            <TouchableOpacity
              style={styles.previousButton}
              onPress={handlePreviousQuestion}
              activeOpacity={0.8}
            >
              <Text style={styles.previousButtonText}>{t('quiz.previous')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextButtonSmall}
              onPress={handleNextQuestion}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>{t('quiz.next')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  loadingStatus: {
    marginTop: spacing[1],
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  simProgressBar: {
    width: 220,
    height: 6,
    backgroundColor: '#F9F9F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing[5],
  },
  simProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  simProgressPct: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  backButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.neutral[900],
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerBackButton: {
    padding: spacing[1],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
  },
  timerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: '#F59E0B',
    marginLeft: spacing[1],
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    marginTop: spacing[3],
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  progressPercentage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F9F9F9',
    marginHorizontal: spacing[5],
    marginTop: spacing[2],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
  },
  questionText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: 28,
    marginBottom: spacing[6],
  },
  optionsContainer: {
    gap: spacing[3],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  optionButtonSelected: {
    backgroundColor: '#FED7AA',
    borderColor: '#FED7AA',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    marginRight: spacing[3],
  },
  radioButtonSelected: {
    backgroundColor: '#FED7AA',
    borderColor: '#FED7AA',
  },
  optionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  optionTextSelected: {
    fontWeight: typography.fontWeight.medium,
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    paddingBottom: spacing[8],
  },
  footerButtonsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  nextButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: 'center',
  },
  nextButtonSmall: {
    flex: 1,
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  previousButton: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: 'center',
  },
  previousButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
});