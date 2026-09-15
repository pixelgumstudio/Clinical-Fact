import React, { useCallback, useEffect, useState } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, Icon, SparkleIcon, theme } from '@clinicalfact/design-system';
import { CreateQuizModal } from '../../components/CreateQuizModal';
import { CreateFlashcardsModal } from '../../components/CreateFlashcardsModal';
import { LanguageSupportModal } from '../../components/LanguageSupportModal';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAIConsentStore } from '../../store/aiConsentStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useGatedFeature } from '../../hooks/useGatedFeature';
import { useFlashcardSync } from '../../hooks/useFlashcardSync';
import { showInAppPaywall } from '../../services/revenuecat';
import { changeLanguage } from '../../i18n';

type HomeNavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface ChatSession {
  _id: string;
  title: string;
  /** AI-generated one-sentence summary of the conversation, regenerated after every reply —
   *  undefined until the first exchange completes. */
  summary?: string;
  sourceType: 'note' | 'image' | 'document' | 'pdf' | 'medical_qa';
  createdAt: string;
  /** Populated with { _id, title } by the backend when this session has a note attached. */
  noteId?: { _id: string; title: string } | string;
  messages?: { role: 'user' | 'assistant'; content: string }[];
}

const getLinkedNote = (session?: ChatSession) => {
  const noteId = session?.noteId;
  return noteId && typeof noteId === 'object' ? noteId : undefined;
};

/** Plain-text transcript of a session's messages — used as the source for quiz/flashcard
 *  generation when the chat has no note behind it (mirrors ChatConversationScreen). */
const buildSessionTranscript = (session?: ChatSession) =>
  (session?.messages ?? [])
    .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${stripHtml(m.content)}`)
    .join('\n\n');

const getLanguageInfo = (code: string): { flag: string; code: string } => {
  const languageMap: Record<string, { flag: string; code: string }> = {
    en: { flag: '🇺🇸', code: 'En' },
    es: { flag: '🇪🇸', code: 'Es' },
    fr: { flag: '🇫🇷', code: 'Fr' },
    de: { flag: '🇩🇪', code: 'De' },
    pt: { flag: '🇵🇹', code: 'Pt' },
  };
  return languageMap[code] || { flag: '🇺🇸', code: 'En' };
};

const formatCreatedAt = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const day = isToday
    ? 'Today'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `Created ${day}, ${time}`;
};

// Note summaries come back as rich text — strip tags for the one-line preview here.
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const HomeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const { user } = useAuthStore();
  const { hasAccess } = useSubscriptionStore();
  const { withAccess } = useGatedFeature();
  const { loadFlashcardsFromBackend } = useFlashcardSync();

  // Load flashcards from backend on app boot
  useEffect(() => {
    loadFlashcardsFromBackend().catch(err => {
      console.error('Failed to load flashcards:', err);
    });
  }, []);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSessionsLoading, setSessionsLoading] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [flashcardsModalVisible, setFlashcardsModalVisible] = useState(false);
  const [isGeneratingFlashcards, setGeneratingFlashcards] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const response = await api.getChatSessions({ limit: 10 });
      if (response.success && response.data) {
        setSessions((response.data.sessions || (response.data as any).data || []) as ChatSession[]);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      setLanguageModalVisible(false);
      await changeLanguage(languageCode);
      const response = await api.updateUserLanguage(languageCode);
      if (response.success && response.data?.user) {
        await useAuthStore.getState().updateUser({
          preferredLanguage: response.data.user.preferredLanguage || languageCode,
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to update language');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update language');
    }
  };

  const handleTalkToAI = () => {
    // No params — lands on ChatConversationScreen's own branded welcome state.
    navigation.navigate('ChatConversation');
  };

  const handleSelectSession = (session: ChatSession) => {
    navigation.navigate('ChatConversation', {
      chatId: session._id,
      title: session.title,
      type: session.sourceType === 'pdf' ? 'document' : session.sourceType,
      noteId: getLinkedNote(session)?._id,
    });
  };

  const handleOpenQuizModal = () => {
    withAccess(() => setQuizModalVisible(true));
  };

  const handleGenerateQuiz = (questionCount: number, timeInMinutes: number) => {
    setQuizModalVisible(false);
    if (!topSession) return;
    if (topLinkedNote) {
      navigation.navigate('Quiz', {
        noteId: topLinkedNote._id,
        noteTitle: topLinkedNote.title,
        questionCount,
        timeInMinutes,
      });
    } else {
      navigation.navigate('Quiz', {
        chatTranscript: buildSessionTranscript(topSession),
        noteTitle: topSession.title,
        questionCount,
        timeInMinutes,
        chatSessionId: topSession._id,
      });
    }
  };

  const handleOpenFlashcardsModal = () => {
    if (!topSession) return;
    if (topLinkedNote) {
      withAccess(() =>
        navigation.navigate('CreateFlashcards', {
          noteId: topLinkedNote._id,
          noteTitle: topLinkedNote.title,
        })
      );
    } else if (buildSessionTranscript(topSession).length < 100) {
      Alert.alert('Not enough content yet', 'Chat a bit more before generating flashcards (minimum 100 characters).');
    } else {
      withAccess(() => setFlashcardsModalVisible(true));
    }
  };

  const handleConfirmGenerateFlashcards = async (cardCount: number) => {
    if (!topSession) return;
    const consented = await useAIConsentStore.getState().ensureConsent();
    if (!consented) return;
    setGeneratingFlashcards(true);
    try {
      const response = await api.generateFlashcardsFromText(
        buildSessionTranscript(topSession),
        topSession.title,
        cardCount,
        undefined,
        undefined,
        undefined,
        topSession._id
      );
      if (response.success && response.data) {
        setFlashcardsModalVisible(false);
        navigation.navigate('FlashcardReview', {
          setId: response.data._id,
          title: response.data.title,
        });
      } else if (response.quotaExceeded) {
        setFlashcardsModalVisible(false);
        await showInAppPaywall();
      } else {
        Alert.alert('Error', response.message || 'Failed to generate flashcards');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate flashcards');
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const currentLanguage = getLanguageInfo(user?.preferredLanguage || 'en');
  const isLoading = isSessionsLoading;
  const hasChats = sessions.length > 0;
  const topSession = sessions[0];
  const recentSessions = sessions.slice(1);
  const topLinkedNote = getLinkedNote(topSession);
  const jumpDescription = topSession?.summary ? stripHtml(topSession.summary) : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="logo" size={32} />
            <Text style={styles.logoText}>{t('home.title')}</Text>
            <View style={[styles.statusBadge, hasAccess ? styles.proBadge : styles.freeBadge]}>
              <Text style={[styles.statusBadgeText, hasAccess ? styles.proBadgeText : styles.freeBadgeText]}>
                {hasAccess ? t('profile.pro') : t('profile.free')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => setLanguageModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.flagIcon}>{currentLanguage.flag}</Text>
            <Text style={styles.languageText}>{currentLanguage.code}</Text>
            <ChevronDownIcon size={14} color={theme.colors.grey[600]} />
          </TouchableOpacity>
        </View>

        {/* Upgrade banner — free users only */}
        {!hasAccess && (
          <View style={styles.upgradeCard}>
            <View style={styles.upgradeCardText}>
              <Text style={styles.upgradeTitle}>Upgrade to pro</Text>
              <Text style={styles.upgradeDescription}>Get 80% discount when you upgrade your account</Text>
            </View>
            <TouchableOpacity style={styles.unlockButton} onPress={() => showInAppPaywall()} activeOpacity={0.85}>
              <Text style={styles.unlockButtonText}>Unlock PRO</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.yale[700]} />
          </View>
        ) : !hasChats ? (
          // Empty state
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <SparkleIcon size={32} color={theme.colors.white} />
            </View>
            <Text style={styles.emptyTitle}>No medical chats</Text>
            <Text style={styles.emptyDescription}>
              You have not created any medical chats , please start a new chat and get cited sources
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleTalkToAI} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Talk to Clinicalfact AI</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!!topSession && (
              <>
                <Text style={styles.sectionLabel}>Jump in where you stopped</Text>
                <View style={styles.jumpCard}>
                  <Text style={styles.jumpTitle} numberOfLines={2}>{topSession.title}</Text>
                  {!!jumpDescription && (
                    <Text style={styles.jumpDescription} numberOfLines={2}>{jumpDescription}</Text>
                  )}
                  <View style={styles.jumpActionsRow}>
                    <TouchableOpacity style={styles.jumpChip} onPress={handleOpenQuizModal} activeOpacity={0.7}>
                      <View style={styles.jumpChipFlex}>
                      {/* <View style={[styles.jumpChipIcon, styles.jumpChipIconGreen]}> */}
                        <Icon name="quizFill" size={32} color={theme.colors.green[700]} />
                      <Icon name="foward" size={32} color={theme.colors.grey[300]} />
                      </View>
                      <Text style={styles.jumpChipText}>Practice Quiz</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.jumpChip} onPress={handleOpenFlashcardsModal} activeOpacity={0.7}>
                       <View style={styles.jumpChipFlex}>
                        <Icon name="flashcardsFill" size={32} color={theme.colors.orange[700]} />
                      <Icon name="foward" size={32} color={theme.colors.grey[300]} />
                      </View>
                      <Text style={styles.jumpChipText}>Make flashcards</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleSelectSession(topSession)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryButtonText}>
                      {topLinkedNote ? 'Continue chat with Note' : 'Continue chat'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {recentSessions.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Recent chats</Text>
                <View style={styles.chatList}>
                  {recentSessions.map((session, index) => (
                    <TouchableOpacity
                      key={session._id}
                      style={[styles.chatRow, index < recentSessions.length - 1 && styles.chatRowDivider]}
                      onPress={() => handleSelectSession(session)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.chatRowIcon}>
                        <Icon name="chatFill" size={18} color={theme.colors.orange[600]} />
                      </View>
                      <View style={styles.chatRowInfo}>
                        <Text style={styles.chatRowTitle} numberOfLines={1}>{session.title}</Text>
                        <Text style={styles.chatRowDate}>{formatCreatedAt(session.createdAt)}</Text>
                      </View>
                      <Icon name="foward" size={16} color={theme.colors.grey[300]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <CreateQuizModal
        visible={quizModalVisible}
        onClose={() => setQuizModalVisible(false)}
        onGenerateQuiz={handleGenerateQuiz}
        noteTitle={topSession?.title}
      />

      <CreateFlashcardsModal
        visible={flashcardsModalVisible}
        onClose={() => setFlashcardsModalVisible(false)}
        onGenerateFlashcards={handleConfirmGenerateFlashcards}
        isGenerating={isGeneratingFlashcards}
        noteTitle={topSession?.title}
      />

      <LanguageSupportModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onSelectLanguage={handleLanguageSelect}
        selectedLanguage={user?.preferredLanguage || 'en'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[5], // 20
    paddingBottom: theme.spacing[10], // 40
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[3], // 12
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
  },
  logoText: {
    ...theme.typography.textStyles.title1,
    color: theme.colors.grey[900],
  },
  statusBadge: {
    paddingHorizontal: theme.spacing[2], // 8
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  proBadge: {
    backgroundColor: theme.colors.green[100],
  },
  freeBadge: {
    backgroundColor: theme.colors.white,
  },
  statusBadgeText: {
    ...theme.typography.textStyles.label2,
  },
  proBadgeText: {
    color: theme.colors.green[700],
  },
  freeBadgeText: {
    color: theme.colors.grey[600],
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[3], // 12
    paddingVertical: theme.spacing[2], // 8
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing[1], // 4
  },
  flagIcon: {
    fontSize: 16,
  },
  languageText: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
  },
  // Upgrade banner
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[4], // 16
    marginBottom: theme.spacing[6], // 24
    gap: theme.spacing[3], // 12
  },
  upgradeCardText: {
    flex: 1,
  },
  upgradeTitle: {
    ...theme.typography.textStyles.title1,
    color: theme.colors.grey[900],
    marginBottom: 2,
  },
  upgradeDescription: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[500],
  },
  unlockButton: {
    backgroundColor: theme.colors.yale[700],
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[3], // 12
    borderRadius: theme.borderRadius.full,
  },
  unlockButtonText: {
    ...theme.typography.textStyles.button3,
    color: theme.colors.white,
  },
  loadingContainer: {
    paddingVertical: theme.spacing[16], // 64
    alignItems: 'center',
  },
  // Empty state
  emptyCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[6], // 24
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4], // 16
  },
  emptyTitle: {
    ...theme.typography.textStyles.h6,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[2], // 8
  },
  emptyDescription: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[500],
    textAlign: 'center',
    marginBottom: theme.spacing[5], // 20
  },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4], // 16
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...theme.typography.textStyles.button1,
    color: theme.colors.white,
  },
  // Jump-in card
  sectionLabel: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[4], // 16
  },
  jumpCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[4], // 16
    marginBottom: theme.spacing[6], // 24
  },
  jumpTitle: {
    ...theme.typography.textStyles.h6,
    fontSize: 20,
    lineHeight: 26,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[3], // 12
  },
  jumpDescription: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[500],
    marginBottom: theme.spacing[6], // 24
  },
  jumpActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing[4], // 16
    marginBottom: theme.spacing[4], // 16
  },
  jumpChip: {
    display: 'flex',
    gap: theme.spacing[4], // 16
    flex: 1,
    backgroundColor: theme.colors.linen[300],
    borderRadius: theme.borderRadius.md, // 12
    padding: theme.spacing[3], // 12
  },
  jumpChipFlex: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jumpChipIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm, // 8
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[6], // 24
  },
 
  jumpChipText: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
  },
  // Recent chats
  chatList: {
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg, // 16
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    padding: theme.spacing[3], // 12
  },
  chatRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.linen[400],
  },
  chatRowIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRowInfo: {
    flex: 1,
  },
  chatRowTitle: {
    ...theme.typography.textStyles.title1,
    color: theme.colors.grey[900],
    marginBottom: 2,
  },
  chatRowDate: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[500],
  },
});

export default HomeScreen;
