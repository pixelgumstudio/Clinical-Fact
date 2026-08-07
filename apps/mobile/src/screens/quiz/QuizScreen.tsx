import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Icon, theme } from '@clinicalfact/design-system';
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
  const { noteId, noteTitle, questionCount = 5, timeInMinutes = 10, chatTranscript, chatSessionId, quizId, targetLanguage: languageOverride } = route.params || {};
  const { user } = useAuthStore();

  // State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(timeInMinutes * 60);
  const [isLoading, setIsLoading] = useState(true);
  const [simProgress, setSimProgress] = useState(0);
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
    const effectiveLanguage = languageOverride ?? noteData?.studyLanguage ?? user?.studyLanguage ?? user?.preferredLanguage ?? 'en';
    const response = quizId
      ? await api.getQuizById(quizId)
      : chatTranscript
      ? await api.generateQuizFromText(chatTranscript, noteTitle || 'Quiz', questionCount, 'medium', ['multiple-choice'], effectiveLanguage, chatSessionId)
      : await api.generateQuiz(noteId!, questionCount, 'medium', ['multiple-choice'], 'standard', effectiveLanguage);

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
      chatTranscript,
      chatSessionId,
    });
  }, [selectedAnswers, questions, timeRemaining, navigation, noteId, noteTitle, timeInMinutes, chatTranscript, chatSessionId]);

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
          <View style={styles.loadingIconCircle}>
            <Icon name="quizFill" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.loadingText}>{t('quiz.generatingQuizWait')}</Text>
          <View style={styles.simProgressBar}>
            <View style={[styles.simProgressFill, { width: `${simProgress}%` as any }]} />
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
          <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('quiz.question')} {currentQuestionIndex + 1}</Text>
        <View style={styles.timerContainer}>
          <Icon name="time" size={16} color={theme.colors.yale[700]} />
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
        <View style={[styles.progressBarFill, { width: `${progress}%` as any }]} />
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
                <Icon
                  name={isSelected ? 'sucessful' : 'unsucessful'}
                  size={24}
                  color={isSelected ? theme.colors.yale[700] : theme.colors.grey[200]}
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
          <View style={styles.footerSoloRow}>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextQuestion}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>{t('quiz.next')}</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: theme.colors.linen[300],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[8],
  },
  loadingIconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[8],
  },
  loadingText: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    textAlign: 'center',
    marginBottom: theme.spacing[8],
  },
  simProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.grey[10],
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  simProgressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
  },
  simProgressPct: {
    marginTop: theme.spacing[2],
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[900],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[5],
  },
  errorText: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing[4],
  },
  backButton: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    backgroundColor: theme.colors.yale[700],
    borderRadius: theme.borderRadius.full,
  },
  backButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    gap: theme.spacing[1],
  },
  timerText: {
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
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[6],
    paddingBottom: theme.spacing[4],
  },
  questionText: {
    ...theme.typography.textStyles.h7,
    fontFamily: theme.typography.fontFamily.lora,
    fontWeight: '500',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[6],
  },
  optionsContainer: {
    gap: theme.spacing[4],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.grey[10],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    gap: theme.spacing[2],
  },
  optionButtonSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.yale[700],
  },
  optionText: {
    flex: 1,
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[900],
  },
  optionTextSelected: {
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  footerSoloRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  footerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nextButton: {
    minWidth: 172,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
    backgroundColor: theme.colors.yale[700],
    borderWidth: 1,
    borderColor: theme.colors.yale[700],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  nextButtonSmall: {
    width: '48%',
    backgroundColor: theme.colors.yale[700],
    borderWidth: 1,
    borderColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  nextButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
  previousButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  previousButtonText: {
    ...theme.typography.textStyles.button2,
    color: theme.colors.grey[900],
  },
  submitButton: {
    width: '48%',
    backgroundColor: theme.colors.yale[700],
    borderWidth: 1,
    borderColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  submitButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
});