import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  Icon,
  theme,
} from '@clinicalfact/design-system';
import { LanguageSupportModal } from '../../components/LanguageSupportModal';
import { ChatActionSheet } from '../../components/ChatActionSheet';
import { Toast } from '../../components/Toast';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { changeLanguage } from '../../i18n';

type ChatsNavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface ChatSession {
  _id: string;
  title: string;
  sourceType: 'note' | 'image' | 'document' | 'pdf' | 'medical_qa';
  createdAt: string;
  noteId?: string;
  fileId?: string;
  pinnedAt?: string | null;
}

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

export const ChatsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ChatsNavigationProp>();
  const { user } = useAuthStore();
  const { hasAccess } = useSubscriptionStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [sessionForActionSheet, setSessionForActionSheet] = useState<ChatSession | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const response = await api.getChatSessions({ limit: 50 });
      if (response.success && response.data) {
        setSessions((response.data.sessions || (response.data as any).data || []) as ChatSession[]);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const handleSelectSession = (session: ChatSession) => {
    navigation.navigate('ChatConversation', {
      chatId: session._id,
      title: session.title,
      type: session.sourceType === 'pdf' ? 'document' : session.sourceType,
      noteId: session.noteId,
    });
  };

  const handleCreateChat = () => {
    // No params — lands on ChatConversationScreen's own branded welcome state
    // (ChatWelcomeHero), which handles topic cards / typing / attaching itself.
    navigation.navigate('ChatConversation');
  };

  const handleDeleteChat = async (session: ChatSession) => {
    setSessionForActionSheet(null);
    // Optimistic removal — restore the row if the request fails.
    setSessions((prev) => prev.filter((s) => s._id !== session._id));
    const response = await api.deleteChatSession(session._id);
    if (!response.success) {
      setSessions((prev) => [...prev, session]);
      Alert.alert('Error', response.message || 'Failed to delete chat');
    }
  };

  const handleTogglePin = async (session: ChatSession) => {
    setSessionForActionSheet(null);
    const wasPinned = !!session.pinnedAt;
    // Optimistic flip, then re-sort so pinned rows float to the top locally too.
    setSessions((prev) => {
      const next = prev.map((s) =>
        s._id === session._id ? { ...s, pinnedAt: wasPinned ? null : new Date().toISOString() } : s
      );
      return [...next].sort((a, b) => {
        if (!!a.pinnedAt !== !!b.pinnedAt) return a.pinnedAt ? -1 : 1;
        return 0;
      });
    });
    const response = await api.togglePinChatSession(session._id);
    if (!response.success) {
      // Revert on failure (e.g. hit the 3-pin cap).
      setSessions((prev) => prev.map((s) => (s._id === session._id ? { ...s, pinnedAt: session.pinnedAt } : s)));
      if (!wasPinned) {
        setToastMessage("You've reached your 3-pin limit");
      } else {
        Alert.alert('Error', response.message || 'Failed to update pin');
      }
    }
  };

  const handleLanguageSelect = async (languageCode: string) => {
    setLanguageModalVisible(false);
    await changeLanguage(languageCode);
    const response = await api.updateUserLanguage(languageCode);
    if (response.success && response.data?.user) {
      await useAuthStore.getState().updateUser({
        preferredLanguage: response.data.user.preferredLanguage || languageCode,
      });
    }
  };

  const currentLanguage = getLanguageInfo(user?.preferredLanguage || 'en');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <ChevronLeftIcon size={24} color={theme.colors.grey[900]} />
          </TouchableOpacity>
          <Icon name="logo" size={32} />
          <Text style={styles.logoText}>Clinicalfact</Text>
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

      {/* Chat list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.yale[700]} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyDescription}>Start a chat to get answers backed by real sources.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleSelectSession(item)}
              onLongPress={() => setSessionForActionSheet(item)}
              delayLongPress={350}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Icon name="chatFill" size={20} color={theme.colors.yale[700]} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowDate}>{formatCreatedAt(item.createdAt)}</Text>
              </View>
              {!!item.pinnedAt && <Icon name="bookmarks" size={18} color={theme.colors.yale[700]} />}
            </TouchableOpacity>
          )}
        />
      )}

      <ChatActionSheet
        visible={!!sessionForActionSheet}
        chatTitle={sessionForActionSheet?.title ?? ''}
        isPinned={!!sessionForActionSheet?.pinnedAt}
        onClose={() => setSessionForActionSheet(null)}
        onDelete={() => sessionForActionSheet && handleDeleteChat(sessionForActionSheet)}
        onTogglePin={() => sessionForActionSheet && handleTogglePin(sessionForActionSheet)}
      />

      <Toast visible={!!toastMessage} message={toastMessage ?? ''} onHide={() => setToastMessage(null)} />

      {/* Floating create button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateChat}
        activeOpacity={0.85}
      >
        <Text style={styles.createButtonText}>+ Create chat</Text>
      </TouchableOpacity>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5], // 20
    paddingVertical: theme.spacing[3], // 12
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
  },
  backButton: {
    marginRight: theme.spacing[1], // 4
  },
  logoText: {
    ...theme.typography.textStyles.title1,
    color: theme.colors.grey[900],
  },
  statusBadge: {
    paddingHorizontal: theme.spacing[2], // 8
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm, // 8
  },
  proBadge: {
    backgroundColor: theme.colors.green[100],
  },
  freeBadge: {
    backgroundColor: theme.colors.grey[100],
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
  listContent: {
    paddingHorizontal: theme.spacing[5], // 20
    paddingBottom: 96,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    paddingVertical: theme.spacing[3], // 12
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    ...theme.typography.textStyles.title1,
    color: theme.colors.grey[900],
    marginBottom: 2,
  },
  rowDate: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[500],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[8], // 32
  },
  emptyTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[2], // 8
  },
  emptyDescription: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  createButton: {
    position: 'absolute',
    right: theme.spacing[5], // 20
    bottom: theme.spacing[5], // 20
    backgroundColor: theme.colors.yale[700],
    paddingHorizontal: theme.spacing[5], // 20
    paddingVertical: theme.spacing[3], // 12
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.md,
  },
  createButtonText: {
    ...theme.typography.textStyles.button1,
    color: theme.colors.white,
  },
});

export default ChatsScreen;
