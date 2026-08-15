import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon, theme } from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { CreateQuizModal } from '../../components/CreateQuizModal';
import { LanguageSupportModal } from '../../components/LanguageSupportModal';
import { useExportQuiz } from '../../hooks/useExportQuiz';
import { ExportSettingsModal } from '../../components/ExportSettingsModal';

type QuizGroupDetailRouteProp = RouteProp<MainStackParamList, 'QuizGroupDetail'>;
type QuizGroupDetailNavigationProp = NativeStackNavigationProp<MainStackParamList, 'QuizGroupDetail'>;

interface AttemptRow {
  quizId: string;
  label: string;
  title: string;
  totalQuestions: number;
  createdAt: string;
  isCompleted: boolean;
  correctAnswers: number;
}

interface GroupDetail {
  source: { type: 'note' | 'chat'; id: string; title: string; createdAt: string } | null;
  attempts: AttemptRow[];
  lastScore: { correct: number; total: number } | null;
  bestScore: { correct: number; total: number } | null;
  attemptCount: number;
  latestQuizId: string;
  latestQuestionCount: number;
}

type TabType = 'overview' | 'history' | 'flashcards';

interface FlashcardSetRow {
  _id: string;
  title: string;
  totalCards: number;
  masteredCards: number;
  createdAt: string;
}

const getFlashcardStatus = (set: FlashcardSetRow) => {
  if (set.totalCards > 0 && set.masteredCards >= set.totalCards) return 'Mastered';
  if (set.masteredCards > 0) return 'In Progress';
  return 'Not Started';
};

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatFullDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export const QuizGroupDetailScreen = () => {
  const navigation = useNavigation<QuizGroupDetailNavigationProp>();
  const route = useRoute<QuizGroupDetailRouteProp>();
  const { noteId, chatSessionId, title } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSetRow[]>([]);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(true);
  const [isPreparingAction, setIsPreparingAction] = useState<'retake' | 'new' | 'translate' | null>(null);
  const [isCreateQuizModalVisible, setCreateQuizModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const { exportQuiz, isLoading: isExporting, error: exportError } = useExportQuiz();

  const loadGroup = async () => {
    try {
      setIsLoading(true);
      const response = await api.getQuizGroupDetail({ noteId, chatSessionId });
      if (response.success && response.data) {
        setData(response.data);
      } else {
        Alert.alert('Error', 'Failed to load quiz history');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load quiz history');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFlashcardSets = async () => {
    try {
      setIsLoadingFlashcards(true);
      const response = await api.getFlashcardSetsBySource({ noteId, chatSessionId });
      setFlashcardSets(response.success ? response.data || [] : []);
    } catch (error) {
      setFlashcardSets([]);
    } finally {
      setIsLoadingFlashcards(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroup();
      loadFlashcardSets();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId, chatSessionId])
  );

  const getChatTranscript = async (): Promise<string | null> => {
    if (!chatSessionId) return null;
    const response = await api.getChatSession(chatSessionId);
    if (!response.success || !response.data) return null;
    return (response.data.messages || [])
      .map((m: any) => `${m.role === 'user' ? 'Q' : 'A'}: ${stripHtml(m.content)}`)
      .join('\n\n');
  };

  const handleRetake = async () => {
    if (!data || isPreparingAction) return;
    setIsPreparingAction('retake');
    try {
      if (noteId) {
        navigation.navigate('Quiz', {
          noteId,
          noteTitle: title,
          questionCount: data.latestQuestionCount,
          timeInMinutes: 10,
        });
        return;
      }
      const transcript = await getChatTranscript();
      if (!transcript) {
        Alert.alert('Error', 'Failed to load chat content');
        return;
      }
      navigation.navigate('Quiz', {
        chatTranscript: transcript,
        noteTitle: title,
        questionCount: data.latestQuestionCount,
        timeInMinutes: 10,
        chatSessionId,
      });
    } finally {
      setIsPreparingAction(null);
    }
  };

  const handleGenerateNewQuiz = async (questionCount: number, timeInMinutes: number) => {
    setCreateQuizModalVisible(false);
    if (noteId) {
      navigation.navigate('Quiz', { noteId, noteTitle: title, questionCount, timeInMinutes });
      return;
    }
    setIsPreparingAction('new');
    try {
      const transcript = await getChatTranscript();
      if (!transcript) {
        Alert.alert('Error', 'Failed to load chat content');
        return;
      }
      navigation.navigate('Quiz', {
        chatTranscript: transcript,
        noteTitle: title,
        questionCount,
        timeInMinutes,
        chatSessionId,
      });
    } finally {
      setIsPreparingAction(null);
    }
  };

  const handleSelectLanguage = async (languageCode: string) => {
    if (!data || isPreparingAction) return;
    setLanguageModalVisible(false);
    setIsPreparingAction('translate');
    try {
      if (noteId) {
        navigation.navigate('Quiz', {
          noteId,
          noteTitle: title,
          questionCount: data.latestQuestionCount,
          timeInMinutes: 10,
          targetLanguage: languageCode,
        });
        return;
      }
      const transcript = await getChatTranscript();
      if (!transcript) {
        Alert.alert('Error', 'Failed to load chat content');
        return;
      }
      navigation.navigate('Quiz', {
        chatTranscript: transcript,
        noteTitle: title,
        questionCount: data.latestQuestionCount,
        timeInMinutes: 10,
        chatSessionId,
        targetLanguage: languageCode,
      });
    } finally {
      setIsPreparingAction(null);
    }
  };

  const handleExportLatest = () => {
    setMenuVisible(false);
    setExportModalVisible(true);
  };

  const handleOpenSource = () => {
    if (!data?.source) return;
    if (data.source.type === 'note') {
      navigation.navigate('NoteDetail', { noteId: data.source.id, title: data.source.title });
    } else {
      navigation.navigate('ChatConversation', {
        chatId: data.source.id,
        title: data.source.title,
        type: 'medical_qa',
      });
    }
  };

  const handleSelectAttempt = (attempt: AttemptRow) => {
    if (attempt.isCompleted) {
      navigation.navigate('QuizReview', { quizId: attempt.quizId, title: attempt.title, mode: 'review' });
    } else {
      navigation.navigate('Quiz', { quizId: attempt.quizId, noteTitle: attempt.title, timeInMinutes: 10 });
    }
  };

  const handleDeleteGroup = () => {
    if (!data) return;
    setMenuVisible(false);
    Alert.alert(
      'Delete Quiz',
      `Delete all ${data.attempts.length} quiz ${data.attempts.length === 1 ? 'attempt' : 'attempts'} for "${title}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(data.attempts.map((a) => api.deleteQuiz(a.quizId)));
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete quiz');
            }
          },
        },
      ]
    );
  };

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.yale[700]} />
        </View>
      </SafeAreaView>
    );
  }

  const displayTitle = data.source?.title || title;
  const earliestCreatedAt = data.attempts[0]?.createdAt;
  const formatScore = (score: { correct: number; total: number } | null) =>
    score ? `${score.correct}/${score.total}` : '—';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {displayTitle.length > 22 ? `${displayTitle.substring(0, 22)}..` : displayTitle}
        </Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerButton}>
          <Icon name="options" size={24} color={theme.colors.grey[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{displayTitle}</Text>
        {earliestCreatedAt && (
          <Text style={styles.createdAt}>Created {formatFullDate(earliestCreatedAt)}</Text>
        )}

        {data.source && (
          <TouchableOpacity style={styles.sourceCard} onPress={handleOpenSource} activeOpacity={0.7}>
            <View style={styles.sourceIcon}>
              <Icon name={data.source.type === 'chat' ? 'chat' : 'note'} size={20} color={theme.colors.yale[900]} />
            </View>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceTitle} numberOfLines={1}>{data.source.title}</Text>
              <Text style={styles.sourceDate}>Created {formatFullDate(data.source.createdAt)}</Text>
            </View>
            <Icon name="foward" size={16} color={theme.colors.grey[200]} />
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LAST SCORE</Text>
            <Text style={styles.statValue}>{formatScore(data.lastScore)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>BEST SCORE</Text>
            <Text style={styles.statValue}>{formatScore(data.bestScore)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>ATTEMPTS</Text>
            <Text style={styles.statValue}>{data.attemptCount}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.retakeButton}
          onPress={handleRetake}
          disabled={isPreparingAction !== null}
          activeOpacity={0.8}
        >
          {isPreparingAction === 'retake' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.retakeButtonText}>Retake Quiz</Text>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryButtonsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setLanguageModalVisible(true)}
            disabled={isPreparingAction !== null}
            activeOpacity={0.7}
          >
            {isPreparingAction === 'translate' ? (
              <ActivityIndicator size="small" color={theme.colors.grey[900]} />
            ) : (
              <>
                <Icon name="translate" size={20} color={theme.colors.grey[300]} />
                <Text style={styles.secondaryButtonText}>Translate</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCreateQuizModalVisible(true)}
            disabled={isPreparingAction !== null}
            activeOpacity={0.7}
          >
            {isPreparingAction === 'new' ? (
              <ActivityIndicator size="small" color={theme.colors.grey[900]} />
            ) : (
              <Text style={styles.secondaryButtonText}>New Quiz</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {/* <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('overview')} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
            {activeTab === 'overview' && <View style={styles.tabUnderline} />}
          </TouchableOpacity> */}
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('history')} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Quiz history</Text>
            {activeTab === 'history' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('flashcards')} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'flashcards' && styles.tabTextActive]}>Flashcard history</Text>
            {activeTab === 'flashcards' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>
        <View style={styles.tabsDivider} />

        {activeTab === 'history' && (
          <View style={styles.attemptsList}>
            {data.attempts.map((attempt) => (
              <TouchableOpacity
                key={attempt.quizId}
                style={styles.attemptRow}
                onPress={() => handleSelectAttempt(attempt)}
                activeOpacity={0.7}
              >
                <View style={styles.attemptIcon}>
                  <Icon name="quizFill" size={20} color={theme.colors.yale[700]} />
                </View>
                <View style={styles.attemptInfo}>
                  <View style={styles.attemptTopRow}>
                    <Text style={styles.attemptLabel}>{attempt.label}</Text>
                    <Text style={styles.attemptTime}>{formatRelativeTime(attempt.createdAt)}</Text>
                  </View>
                  <Text style={styles.attemptMeta}>
                    {attempt.totalQuestions} questions ·{' '}
                    {attempt.isCompleted ? (
                      <Text style={attempt.correctAnswers / attempt.totalQuestions >= 0.5 ? styles.scoreGood : styles.scoreBad}>
                        Score {attempt.correctAnswers}/{attempt.totalQuestions}
                      </Text>
                    ) : (
                      'Not Started'
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'flashcards' && (
          <View style={styles.attemptsList}>
            {isLoadingFlashcards ? (
              <ActivityIndicator size="small" color={theme.colors.yale[700]} />
            ) : flashcardSets.length === 0 ? (
              <Text style={styles.emptyFlashcardsText}>No flashcard sets from this source yet.</Text>
            ) : (
              flashcardSets.map((set) => (
                <TouchableOpacity
                  key={set._id}
                  style={styles.attemptRow}
                  onPress={() => navigation.navigate('FlashcardReview', { setId: set._id, title: set.title })}
                  activeOpacity={0.7}
                >
                  <View style={styles.attemptIcon}>
                    <Icon name="flashcardsFill" size={20} color={theme.colors.yale[700]} />
                  </View>
                  <View style={styles.attemptInfo}>
                    <View style={styles.attemptTopRow}>
                      <Text style={styles.attemptLabel} numberOfLines={1}>{set.title}</Text>
                      <Text style={styles.attemptTime}>{formatRelativeTime(set.createdAt)}</Text>
                    </View>
                    <Text style={styles.attemptMeta}>
                      {set.totalCards} cards · {getFlashcardStatus(set)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <CreateQuizModal
        visible={isCreateQuizModalVisible}
        onClose={() => setCreateQuizModalVisible(false)}
        onGenerateQuiz={handleGenerateNewQuiz}
        noteTitle={displayTitle}
      />

      <LanguageSupportModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onSelectLanguage={handleSelectLanguage}
      />

      <ExportSettingsModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={async (format, includeAnswers) => {
          await exportQuiz(data.latestQuizId, displayTitle, format, includeAnswers, true);
          setExportModalVisible(false);
        }}
        title={displayTitle}
        isLoading={isExporting}
        error={exportError}
      />

      {/* ••• Menu */}
      <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuModalContainer}>
                <View style={styles.menuHandleBar} />
                <View style={styles.menuHeaderRow}>
                  <Text style={styles.menuHeaderTitle}>Quiz options</Text>
                  <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.menuCloseButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="close" size={20} color={theme.colors.grey[600]} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.menuModalOption} activeOpacity={0.7} onPress={handleExportLatest}>
                  <Icon name="export" size={24} color={theme.colors.yale[700]} />
                  <Text style={styles.menuModalOptionText}>Export latest attempt</Text>
                  <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuModalOption} activeOpacity={0.7} onPress={handleDeleteGroup}>
                  <Icon name="delete" size={24} color={theme.colors.yale[700]} />
                  <Text style={styles.menuModalOptionText}>Delete</Text>
                  <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing[3],
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[8],
  },
  title: {
    fontFamily: theme.typography.fontFamily.lora,
    fontWeight: '500',
    fontSize: 20,
    lineHeight: 28,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[2],
  },
  createdAt: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[500],
    marginBottom: theme.spacing[4],
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.linen[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceInfo: {
    flex: 1,
    gap: 4,
  },
  sourceTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[800],
  },
  sourceDate: {
    ...theme.typography.textStyles.caption1,
    color: theme.colors.grey[500],
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[5],
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.linen[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    padding: theme.spacing[4],
    gap: theme.spacing[4],
  },
  statLabel: {
    ...theme.typography.textStyles.label1,
    color: theme.colors.grey[600],
  },
  statValue: {
    ...theme.typography.textStyles.subtitle1,
    fontWeight: '600',
    color: theme.colors.yale[900],
  },
  retakeButton: {
    backgroundColor: theme.colors.yale[700],
    height: 56,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  retakeButtonText: {
    ...theme.typography.textStyles.subtitle1,
    color: '#FFFFFF',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[6],
  },
  secondaryButton: {
    width: '48%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.full,
  },
  secondaryButtonText: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  tabsRow: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'flex-start',
    paddingVertical: theme.spacing[2],
    gap: theme.spacing[2],
  },
  tabText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[500],
  },
  tabTextActive: {
    color: theme.colors.grey[900],
  },
  tabUnderline: {
    height: 2,
    width: '100%',
    backgroundColor: theme.colors.grey[900],
  },
  tabsDivider: {
    height: 1,
    backgroundColor: theme.colors.grey[100],
    marginBottom: theme.spacing[4],
  },
  attemptsList: {
    gap: theme.spacing[3],
  },
  emptyFlashcardsText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[500],
    textAlign: 'center',
    paddingVertical: theme.spacing[4],
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    padding: theme.spacing[4],
  },
  attemptIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.linen[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  attemptInfo: {
    flex: 1,
    gap: theme.spacing[2],
  },
  attemptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attemptLabel: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  attemptTime: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
  },
  attemptMeta: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
  },
  scoreGood: {
    color: theme.colors.green[600],
  },
  scoreBad: {
    color: theme.colors.red[600],
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 22, 39, 0.35)',
    justifyContent: 'flex-end',
  },
  menuModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius['3xl'],
    borderTopRightRadius: theme.borderRadius['3xl'],
    paddingTop: theme.spacing[3],
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[8],
  },
  menuHandleBar: {
    width: 60,
    height: 8,
    backgroundColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.full,
    alignSelf: 'center',
    marginBottom: theme.spacing[5],
  },
  menuHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  menuHeaderTitle: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
  },
  menuCloseButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  menuModalOptionText: {
    flex: 1,
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
});
