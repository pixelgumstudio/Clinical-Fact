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
import { CreateFlashcardsModal } from '../../components/CreateFlashcardsModal';
import { LanguageSupportModal } from '../../components/LanguageSupportModal';
import { useExportFlashcard } from '../../hooks/useExportFlashcard';
import { ExportSettingsModal } from '../../components/ExportSettingsModal';

type FlashcardGroupDetailRouteProp = RouteProp<MainStackParamList, 'FlashcardGroupDetail'>;
type FlashcardGroupDetailNavigationProp = NativeStackNavigationProp<MainStackParamList, 'FlashcardGroupDetail'>;

interface SetRow {
  setId: string;
  label: string;
  title: string;
  totalCards: number;
  masteredCards: number;
  createdAt: string;
}

interface QuizAttemptRow {
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
  sets: SetRow[];
  lastProgress: { mastered: number; total: number };
  bestProgress: { mastered: number; total: number };
  setCount: number;
  latestSetId: string;
  latestCardCount: number;
}

type TabType = 'overview' | 'sets' | 'quizzes';

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();

const getSetStatus = (set: SetRow) => {
  if (set.totalCards > 0 && set.masteredCards >= set.totalCards) return 'Mastered';
  if (set.masteredCards > 0) return 'In Progress';
  return 'Not Started';
};

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

export const FlashcardGroupDetailScreen = () => {
  const navigation = useNavigation<FlashcardGroupDetailNavigationProp>();
  const route = useRoute<FlashcardGroupDetailRouteProp>();
  const { noteId, chatSessionId, title } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<GroupDetail | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRow[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('sets');
  const [isPreparingAction, setIsPreparingAction] = useState<'study' | 'new' | 'translate' | null>(null);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const { exportFlashcard, isLoading: isExporting, error: exportError } = useExportFlashcard();

  const loadGroup = async () => {
    try {
      setIsLoading(true);
      const response = await api.getFlashcardGroupDetail({ noteId, chatSessionId });
      if (response.success && response.data) {
        setData(response.data);
      } else {
        Alert.alert('Error', 'Failed to load flashcard history');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load flashcard history');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuizAttempts = async () => {
    try {
      setIsLoadingQuizzes(true);
      const response = await api.getQuizGroupDetail({ noteId, chatSessionId });
      setQuizAttempts(response.success && response.data ? response.data.attempts : []);
    } catch (error) {
      setQuizAttempts([]);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroup();
      loadQuizAttempts();
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

  const generateSet = async (cardCount: number, targetLanguage?: string) => {
    if (noteId) {
      return api.generateFlashcards(noteId, cardCount, 'medium', [], targetLanguage);
    }
    const transcript = await getChatTranscript();
    if (!transcript) throw new Error('Failed to load chat content');
    return api.generateFlashcardsFromText(transcript, title, cardCount, 'medium', [], targetLanguage, chatSessionId);
  };

  const handleStudyNow = () => {
    if (!data) return;
    navigation.navigate('FlashcardReview', { setId: data.latestSetId, title });
  };

  const handleGenerateNew = async (cardCount: number) => {
    if (!data) return;
    setIsPreparingAction('new');
    try {
      const response = await generateSet(cardCount);
      if (response.success && response.data) {
        setCreateModalVisible(false);
        navigation.navigate('FlashcardReview', { setId: response.data._id, title: response.data.title || title });
      } else if ((response as any).quotaExceeded) {
        setCreateModalVisible(false);
        Alert.alert('Limit reached', response.message || 'Flashcard generation limit reached.');
      } else {
        Alert.alert('Error', response.message || 'Failed to generate flashcards');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate flashcards');
    } finally {
      setIsPreparingAction(null);
    }
  };

  const handleSelectLanguage = async (languageCode: string) => {
    if (!data) return;
    setLanguageModalVisible(false);
    setIsPreparingAction('translate');
    try {
      const response = await generateSet(data.latestCardCount, languageCode);
      if (response.success && response.data) {
        navigation.navigate('FlashcardReview', { setId: response.data._id, title: response.data.title || title });
      } else {
        Alert.alert('Error', response.message || 'Failed to translate flashcards');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to translate flashcards');
    } finally {
      setIsPreparingAction(null);
    }
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

  const handleSelectQuizAttempt = (attempt: QuizAttemptRow) => {
    if (attempt.isCompleted) {
      navigation.navigate('QuizReview', { quizId: attempt.quizId, title: attempt.title, mode: 'review' });
    } else {
      navigation.navigate('Quiz', { quizId: attempt.quizId, noteTitle: attempt.title, timeInMinutes: 10 });
    }
  };

  const handleExportLatest = () => {
    setMenuVisible(false);
    setExportModalVisible(true);
  };

  const handleDeleteGroup = () => {
    if (!data) return;
    setMenuVisible(false);
    Alert.alert(
      'Delete Flashcards',
      `Delete all ${data.sets.length} flashcard ${data.sets.length === 1 ? 'set' : 'sets'} for "${title}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(data.sets.map((s) => api.deleteFlashcardSet(s.setId)));
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete flashcards');
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
  const earliestCreatedAt = data.sets[0]?.createdAt;
  const formatProgress = (progress: { mastered: number; total: number }) =>
    progress.total > 0 ? `${progress.mastered}/${progress.total}` : '—';

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
            <Text style={styles.statLabel}>LAST PROGRESS</Text>
            <Text style={styles.statValue}>{formatProgress(data.lastProgress)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>BEST PROGRESS</Text>
            <Text style={styles.statValue}>{formatProgress(data.bestProgress)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SETS</Text>
            <Text style={styles.statValue}>{data.setCount}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStudyNow}
          disabled={isPreparingAction !== null}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Study Now</Text>
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
            onPress={() => setCreateModalVisible(true)}
            disabled={isPreparingAction !== null}
            activeOpacity={0.7}
          >
            {isPreparingAction === 'new' ? (
              <ActivityIndicator size="small" color={theme.colors.grey[900]} />
            ) : (
              <Text style={styles.secondaryButtonText}>New Flashcards</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {/* <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('overview')} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
            {activeTab === 'overview' && <View style={styles.tabUnderline} />}
          </TouchableOpacity> */}
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('sets')} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'sets' && styles.tabTextActive]}>Flashcard history</Text>
            {activeTab === 'sets' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('quizzes')} activeOpacity={0.7}>
            <Text style={[styles.tabText, activeTab === 'quizzes' && styles.tabTextActive]}>Quiz history</Text>
            {activeTab === 'quizzes' && <View style={styles.tabUnderline} />}
          </TouchableOpacity> */}
        </View>
        <View style={styles.tabsDivider} />

        {activeTab === 'sets' && (
          <View style={styles.rowsList}>
            {data.sets.map((set) => (
              <TouchableOpacity
                key={set.setId}
                style={styles.row}
                onPress={() => navigation.navigate('FlashcardReview', { setId: set.setId, title: set.title })}
                activeOpacity={0.7}
              >
                <View style={styles.rowIcon}>
                  <Icon name="flashcardsFill" size={20} color={theme.colors.yale[700]} />
                </View>
                <View style={styles.rowInfo}>
                  <View style={styles.rowTopRow}>
                    <Text style={styles.rowLabel}>{set.label}</Text>
                    <Text style={styles.rowTime}>{formatRelativeTime(set.createdAt)}</Text>
                  </View>
                  <Text style={styles.rowMeta}>
                    {set.totalCards} cards · {getSetStatus(set)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'quizzes' && (
          <View style={styles.rowsList}>
            {isLoadingQuizzes ? (
              <ActivityIndicator size="small" color={theme.colors.yale[700]} />
            ) : quizAttempts.length === 0 ? (
              <Text style={styles.emptyText}>No quizzes from this source yet.</Text>
            ) : (
              quizAttempts.map((attempt) => (
                <TouchableOpacity
                  key={attempt.quizId}
                  style={styles.row}
                  onPress={() => handleSelectQuizAttempt(attempt)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowIcon}>
                    <Icon name="quizFill" size={20} color={theme.colors.yale[700]} />
                  </View>
                  <View style={styles.rowInfo}>
                    <View style={styles.rowTopRow}>
                      <Text style={styles.rowLabel}>{attempt.label}</Text>
                      <Text style={styles.rowTime}>{formatRelativeTime(attempt.createdAt)}</Text>
                    </View>
                    <Text style={styles.rowMeta}>
                      {attempt.totalQuestions} questions ·{' '}
                      {attempt.isCompleted ? `Score ${attempt.correctAnswers}/${attempt.totalQuestions}` : 'Not Started'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <CreateFlashcardsModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onGenerateFlashcards={handleGenerateNew}
        isGenerating={isPreparingAction === 'new'}
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
          await exportFlashcard(data.latestSetId, displayTitle, format, includeAnswers, true);
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
                  <Text style={styles.menuHeaderTitle}>Flashcard options</Text>
                  <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.menuCloseButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="close" size={20} color={theme.colors.grey[600]} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.menuModalOption} activeOpacity={0.7} onPress={handleExportLatest}>
                  <Icon name="export" size={24} color={theme.colors.yale[700]} />
                  <Text style={styles.menuModalOptionText}>Export latest set</Text>
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
  primaryButton: {
    backgroundColor: theme.colors.yale[700],
    height: 56,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
  },
  primaryButtonText: {
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
  rowsList: {
    gap: theme.spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    padding: theme.spacing[4],
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.linen[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    gap: theme.spacing[2],
  },
  rowTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  rowTime: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
  },
  rowMeta: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
  },
  emptyText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[500],
    textAlign: 'center',
    paddingVertical: theme.spacing[4],
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
    marginBottom: theme.spacing[3],
  },
  menuModalOptionText: {
    flex: 1,
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
});
