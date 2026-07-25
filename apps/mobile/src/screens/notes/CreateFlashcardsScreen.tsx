import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  useWindowDimensions,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@clinicfact/design-system";
import {
  useFlashcardStore,
  FLASHCARD_COLORS,
} from "../../store/flashcardStore";
import { MainStackParamList } from "../../navigation/MainStackNavigator";
import api from "../../services/api";
import { useGatedFeature } from "../../hooks/useGatedFeature";
import { useSubscriptionStore } from "../../store/subscriptionStore";
import { useAuthStore } from "../../store/authStore";
import { showInAppPaywall } from "../../services/revenuecat";
import { FlashcardHistoryList } from "../../components/FlashcardHistoryList";
import { FlashcardExportModal } from "../../components/FlashcardExportModal";

type CreateFlashcardsRouteProp = RouteProp<
  MainStackParamList,
  "CreateFlashcards"
>;
type CreateFlashcardsNavigationProp = NativeStackNavigationProp<
  MainStackParamList,
  "CreateFlashcards"
>;

interface FlashcardData {
  question: string;
  answer: string;
}

export const CreateFlashcardsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<CreateFlashcardsNavigationProp>();
  const route = useRoute<CreateFlashcardsRouteProp>();
  const { noteId, noteTitle } = route.params || {};

  const { createFlashcardSet, addFlashcard, currentSet } = useFlashcardStore();
  const { withAccess } = useGatedFeature();
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);
  const { user, updateUser } = useAuthStore();

  const [step, setStep] = useState<"setup" | "create" | "review" | "complete">(
    "setup",
  );
  const [completeTab, setCompleteTab] = useState<"completion" | "history">("completion");
  const [numCards, setNumCards] = useState(10);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [noteData, setNoteData] = useState<any>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const FLASHCARD_STATUSES = [
    t('flashcards.reading'),
    t('flashcards.identifying'),
    t('flashcards.creating'),
    t('flashcards.almostReady'),
  ];

  const flipAnim = useState(new Animated.Value(0))[0];

  // Cycle status strings while generating
  useEffect(() => {
    if (!isGenerating) { setStatusIndex(0); return; }
    const id = setInterval(() => setStatusIndex((i) => (i + 1) % FLASHCARD_STATUSES.length), 3000);
    return () => clearInterval(id);
  }, [isGenerating]);

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

  // Simulated deterministic progress: 0→85% over 10s, then crawls to 95%, holds until API
  useEffect(() => {
    if (!isGenerating) return;
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
  }, [isGenerating]);

  const handleStartCreating = async () => {
  // 🛡️ Shield 1: Pre-flight (The Nuclear Option)
  if (!hasAccess) {
    console.log('Shield: Blocking free user from flashcards.');
    // If this is in a modal, call onClose() here first
    // Then delay the paywall to avoid iOS modal collision
    setTimeout(async () => {
      try {
        await showInAppPaywall();
      } catch (e) {
        console.error('Paywall error:', e);
      }
    }, 600);
    return;
  }

  if (!noteId) {
    Alert.alert(t('common.error'), t('flashcards.noteIdRequired'));
    return;
  }

  if (numCards < 1 || numCards > 100) {
    Alert.alert(t('common.error'), t('flashcards.invalidCardCount'));
    return;
  }

  try {
    setIsGenerating(true);
    const effectiveLanguage = noteData?.studyLanguage ?? user?.studyLanguage ?? user?.preferredLanguage ?? 'en';
    const response = await api.generateFlashcards(noteId, numCards, "medium", [], effectiveLanguage);

    if (response.success && response.data) {
      const generatedCards = response.data.cards || [];

      const mappedCards: FlashcardData[] = generatedCards.map((card: any) => ({
        question: card.front,
        answer: card.back,
      }));

      setFlashcards(mappedCards);
      setCurrentCardIndex(0);
      setStep("review");
    }
    // 🛡️ Shield 2: Backend interceptor (in case Shield 1 was bypassed)
    else if ((response as any).status === 402 || (response as any).quotaExceeded === true) {
      setTimeout(() => {
        showInAppPaywall();
      }, 600);
    }
    else {
      Alert.alert("Error", response.message || "Failed to generate flashcards");
    }
  } catch (error: any) {
    console.error("Flashcard generation error:", error);

    // 🛡️ Shield 3: Catch block interceptor
    const statusCode = error.status || error.response?.status;
    if (statusCode === 402 || (error.message && error.message.includes('limit reached'))) {
      setTimeout(() => {
        showInAppPaywall();
      }, 600);
    } else {
      Alert.alert("Error", error.message || "An unexpected error occurred");
    }
  } finally {
    setIsGenerating(false);
  }
};

  const flipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleNextCard = () => {
    if (step === "review") {
      // In review mode, just navigate through generated cards
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setIsFlipped(false);
        flipAnim.setValue(0);
      } else {
        setStep("complete");
      }
    } else if (currentQuestion.trim()) {
      // In create mode, save the card
      const newFlashcard: FlashcardData = {
        question: currentQuestion,
        answer: currentAnswer || "",
      };

      const updatedFlashcards = [...flashcards, newFlashcard];
      setFlashcards(updatedFlashcards);

      if (currentSet) {
        const colorIndex = currentCardIndex % FLASHCARD_COLORS.length;
        addFlashcard(
          currentSet.id,
          currentQuestion,
          currentAnswer || "",
          FLASHCARD_COLORS[colorIndex],
        );
      }

      if (currentCardIndex < numCards - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setCurrentQuestion("");
        setCurrentAnswer("");
        setIsFlipped(false);
        flipAnim.setValue(0);
      } else {
        setStep("complete");
      }
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      if (step !== "review") {
        const prevCard = flashcards[currentCardIndex - 1];
        setCurrentQuestion(prevCard.question);
        setCurrentAnswer(prevCard.answer);
      }
      setIsFlipped(false);
      flipAnim.setValue(0);
    }
  };

  const handleBackToNotes = () => {
    navigation.goBack();
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 90, 180],
    outputRange: [1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 90, 180],
    outputRange: [0, 0, 1],
  });

  if (step === "setup") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>{t('flashcards.title')}</Text>
          <Text style={styles.setupSubtitle}>
            {t('flashcards.setupSubtitle')}
          </Text>

          <View style={styles.flashcardIcon}>
            <View style={styles.iconCard}>
              <Text style={styles.iconText}>📝</Text>
            </View>
          </View>

          <Text style={styles.questionLabel}>{t('flashcards.howManyQuestions')}</Text>

          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setNumCards(Math.max(1, numCards - 1))}
              activeOpacity={0.7}
            >
              <Text style={styles.counterButtonText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.counterValue}>{numCards}</Text>

            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setNumCards(numCards + 1)}
              activeOpacity={0.7}
            >
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {isGenerating && (
            <View style={styles.generatingContainer}>
              <Text style={styles.generatingStatus}>{FLASHCARD_STATUSES[statusIndex]}</Text>
              <View style={styles.simProgressBar}>
                <LinearGradient
                  colors={['#F9C597', '#FFB09C', '#EBE19F', '#CEF9D0'] as any}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.simProgressFill, { width: `${simProgress}%` as any }]}
                />
              </View>
              <Text style={styles.simProgressPct}>{Math.round(simProgress)}%</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.generateButton,
              isGenerating && styles.generateButtonDisabled,
            ]}
            onPress={() => withAccess(handleStartCreating)}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <Text style={styles.generateButtonText}>
              {isGenerating ? t('flashcards.generatingEllipsis') : t('flashcards.generateButton')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "complete") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, completeTab === "completion" && styles.tabActive]}
            onPress={() => setCompleteTab("completion")}
          >
            <Text style={[styles.tabText, completeTab === "completion" && styles.tabTextActive]}>
              {t('flashcards.allDone')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, completeTab === "history" && styles.tabActive]}
            onPress={() => setCompleteTab("history")}
          >
            <Text style={[styles.tabText, completeTab === "history" && styles.tabTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {completeTab === "completion" ? (
          <View style={styles.completeContainer}>
            <View style={styles.completeContent}>
              <View style={styles.completeBadge}>
                <Text style={styles.completeBadgeText}>✓</Text>
              </View>

              <Text style={styles.completeTitle}>{t('flashcards.allDone')}</Text>
              <Text style={styles.completeSubtitle}>
                {t('flashcards.completedReview')}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToNotes}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>{t('flashcards.backToNotes')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            <FlashcardHistoryList noteId={noteId} />
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // Review or Create flashcard step
  const colorIndex = currentCardIndex % FLASHCARD_COLORS.length;
  const cardColor = FLASHCARD_COLORS[colorIndex];
  const totalCards = step === "review" ? flashcards.length : numCards;
  const progress = ((currentCardIndex + 1) / totalCards) * 100;

  // Get current flashcard data for review mode
  const currentFlashcard =
    step === "review" ? flashcards[currentCardIndex] : null;

  // Debug logging
  if (step === "review" && currentFlashcard) {
    console.log("📇 Current flashcard:", currentCardIndex, currentFlashcard);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 20 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backIcon}
          >
            <ChevronLeftIcon size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('flashcards.headerTitle')}</Text>
          {step === "review" && currentSet && (
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => setExportModalVisible(true)}
            >
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
          )}
          {(!step || step !== "review") && <View style={styles.placeholder} />}
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {t('flashcards.progressFormat', { current: currentCardIndex + 1, total: totalCards })}
          </Text>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={['#F9C597', '#FFB09C', '#EBE19F', '#CEF9D0'] as any}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.progressBarFill, { width: `${progress}%` as any }]}
            />
          </View>
          <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
        </View>

        {/* Flashcard */}
        <View style={styles.cardContainer}>
          <View style={styles.cardWrapper}>
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={flipCard}
              style={styles.cardTouchable}
            >
              <Animated.View
                style={[
                  styles.flashcard,
                  { backgroundColor: cardColor },
                  {
                    transform: [{ rotateY: frontInterpolate }],
                    opacity: frontOpacity,
                  },
                ]}
              >
                <Text style={styles.cardLabel}>{t('flashcards.question')}</Text>
                {step === "review" ? (
                  <ScrollView
                    style={styles.cardScrollView}
                    contentContainerStyle={styles.cardTextContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.cardText}>
                      {currentFlashcard?.question || t('flashcards.noQuestionText')}
                    </Text>
                  </ScrollView>
                ) : (
                  <TextInput
                    style={styles.cardInput}
                    placeholder={t('flashcards.enterQuestion')}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    multiline
                    value={currentQuestion}
                    onChangeText={setCurrentQuestion}
                  />
                )}
                <View style={styles.flipButton}>
                  <Text style={styles.flipButtonText}>{t('flashcards.clickToFlip')}</Text>
                </View>
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.95}
              onPress={flipCard}
              style={styles.cardTouchable}
            >
              <Animated.View
                style={[
                  styles.flashcard,
                  styles.flashcardBack,
                  { backgroundColor: cardColor },
                  {
                    transform: [{ rotateY: backInterpolate }],
                    opacity: backOpacity,
                  },
                ]}
              >
                <Text style={styles.cardLabel}>{t('flashcards.answer')}</Text>
                {step === "review" ? (
                  <ScrollView
                    style={styles.cardScrollView}
                    contentContainerStyle={styles.cardTextContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.cardText}>
                      {currentFlashcard?.answer || t('flashcards.noAnswerText')}
                    </Text>
                  </ScrollView>
                ) : (
                  <TextInput
                    style={styles.cardInput}
                    placeholder={t('flashcards.enterAnswer')}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    multiline
                    value={currentAnswer}
                    onChangeText={setCurrentAnswer}
                  />
                )}
                <View style={styles.flipButton}>
                  <Text style={styles.flipButtonText}>{t('flashcards.clickToFlip')}</Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Navigation */}
          <View style={styles.cardNavigation}>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentCardIndex === 0 && styles.navButtonDisabled,
              ]}
              onPress={handlePrevCard}
              disabled={currentCardIndex === 0}
              activeOpacity={0.7}
            >
              <ChevronLeftIcon
                size={24}
                color={currentCardIndex === 0 ? "#6B7280" : "#FFFFFF"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                step !== "review" &&
                  !currentQuestion.trim() &&
                  styles.navButtonDisabled,
              ]}
              onPress={handleNextCard}
              disabled={step !== "review" && !currentQuestion.trim()}
              activeOpacity={0.7}
            >
              <ChevronRightIcon
                size={24}
                color={
                  step !== "review" && !currentQuestion.trim()
                    ? "#6B7280"
                    : "#FFFFFF"
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Export Modal */}
      {currentSet && (
        <FlashcardExportModal
          visible={exportModalVisible}
          setId={currentSet.id}
          setTitle={currentSet.title || noteTitle || 'Flashcards'}
          onClose={() => setExportModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  setupContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
  },
  setupTitle: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  setupSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing[8],
  },
  flashcardIcon: {
    width: 120,
    height: 120,
    backgroundColor: "#FFF7ED",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[8],
  },
  iconCard: {
    width: 80,
    height: 80,
    backgroundColor: "#FFEDD5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 40,
  },
  questionLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[12],
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  counterButtonText: {
    fontSize: 24,
    color: colors.text.primary,
  },
  counterValue: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginHorizontal: spacing[8],
    minWidth: 60,
    textAlign: "center",
  },
  generatingContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  generatingStatus: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  simProgressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#F9F9F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing[2],
  },
  simProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  simProgressPct: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  generateButton: {
    width: "100%",
    backgroundColor: "#1C1C1C",
    borderRadius: 24,
    paddingVertical: spacing[4],
    alignItems: "center",
  },
  generateButtonDisabled: {
    backgroundColor: colors.neutral[400],
    opacity: 0.6,
  },
  generateButtonText: {
    color: colors.neutral[0],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  backIcon: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  exportButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.primary[500],
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  exportButtonText: {
    color: colors.neutral[0],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  progressContainer: {
    paddingHorizontal: spacing[5],
    marginBottom: spacing[6],
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F9F9F9",
    borderRadius: 3,
    marginBottom: spacing[2],
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: "right",
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: spacing[5],
  },
  cardWrapper: {
    position: "relative",
    height: 550,
    marginBottom: spacing[8],
  },
  cardTouchable: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  flashcard: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    padding: spacing[8],
    justifyContent: "center",
    backfaceVisibility: "hidden",
  },
  flashcardBack: {
    position: "absolute",
  },
  cardLabel: {
    fontSize: typography.fontSize.sm,
    color: "rgba(255,255,255,0.2)",
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[4],
    textAlign: "center",
  },
  cardScrollView: {
    flex: 1,
  },
  cardTextContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    minHeight: 380,
  },
  cardInput: {
    flex: 1,
    fontSize: typography.fontSize.xl,
    color: "#FFF",
    fontWeight: typography.fontWeight.semibold,
    textAlign: "center",
  },
  cardText: {
    fontSize: typography.fontSize.xl,
    color: "rgba(0,0,0,0.8)",
    fontWeight: typography.fontWeight.semibold,
    textAlign: "center",
    lineHeight: 32,
    width: "100%",
  },
  flipButton: {
    alignSelf: "center",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  flipButtonText: {
    fontSize: typography.fontSize.sm,
    color: "rgba(0,0,0,0.6)",
  },
  cardNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1C1C1C",
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  completeContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[12],
  },
  completeContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  completeBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing[6],
  },
  completeBadgeText: {
    fontSize: 60,
    color: "#F97316",
  },
  completeTitle: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  completeSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: "center",
  },
  backButton: {
    width: "100%",
    backgroundColor: "#1C1C1C",
    borderRadius: 24,
    paddingVertical: spacing[4],
    alignItems: "center",
  },
  backButtonText: {
    color: colors.neutral[0],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    paddingHorizontal: spacing[5],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[4],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabActive: {
    borderBottomColor: '#1C1C1C',
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: '#1C1C1C',
    fontWeight: typography.fontWeight.semibold,
  },
});
