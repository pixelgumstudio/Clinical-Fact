import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  typography,
  CloseIcon,
  SearchIcon,
  Icon,
  ChatWithNoteIcon,
  ChatWithImageIcon,
  ChatWithDocumentIcon,
  Switch,
} from '@clinicalfact/design-system';
import api from '../services/api';
import { useMedicalSearchStore } from '../store/medicalSearchStore';
import { ChatActionSheet } from './ChatActionSheet';
import { Toast } from './Toast';

export interface ChatSessionSummary {
  _id: string;
  title: string;
  sourceType: 'note' | 'image' | 'document' | 'pdf' | 'medical_qa';
  noteId?: string;
  fileId?: string;
  pinnedAt?: string | null;
}

interface ChatSidebarProps {
  visible: boolean;
  onClose: () => void;
  activeSessionId?: string;
  onSelectSession: (session: ChatSessionSummary) => void;
  onStartNew: (type: 'note' | 'image' | 'document') => void;
  onStartMedical: () => void;
  /** Bumped by the parent whenever a session is created/renamed, to force a list refresh. */
  refreshKey?: number;
  /** Fired after a session is successfully deleted, so the parent can reset if it was open. */
  onSessionDeleted?: (sessionId: string) => void;
}

const SIDEBAR_WIDTH = Math.min(320, Dimensions.get('window').width * 0.8);

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  visible,
  onClose,
  activeSessionId,
  onSelectSession,
  onStartNew,
  onStartMedical,
  refreshKey,
  onSessionDeleted,
}) => {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionForActionSheet, setSessionForActionSheet] = useState<ChatSessionSummary | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { liveSearchEnabled, toggleLiveSearch } = useMedicalSearchStore();
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -SIDEBAR_WIDTH,
        duration: 300,
        easing: visible ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateX, backdropOpacity]);

  useEffect(() => {
    if (visible) loadSessions();
  }, [visible, refreshKey]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const response = await api.getChatSessions({ limit: 50 });
      if (response.success && response.data) {
        setSessions((response.data.sessions || (response.data as any).data || []) as ChatSessionSummary[]);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (session: ChatSessionSummary) => {
    setSessionForActionSheet(null);
    setSessions((prev) => prev.filter((s) => s._id !== session._id));
    const response = await api.deleteChatSession(session._id);
    if (response.success) {
      onSessionDeleted?.(session._id);
    } else {
      setSessions((prev) => [...prev, session]);
      Alert.alert('Error', response.message || 'Failed to delete chat');
    }
  };

  const handleToggleSessionPin = async (session: ChatSessionSummary) => {
    setSessionForActionSheet(null);
    const wasPinned = !!session.pinnedAt;
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
      setSessions((prev) => prev.map((s) => (s._id === session._id ? { ...s, pinnedAt: session.pinnedAt } : s)));
      if (!wasPinned) {
        setToastMessage("You've reached your 3-pin limit");
      } else {
        Alert.alert('Error', response.message || 'Failed to update pin');
      }
    }
  };

  return (
    <>
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sidebar, { paddingTop: insets.top + spacing[3], transform: [{ translateX }] }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <CloseIcon size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.newChatSection}>
          <TouchableOpacity style={styles.newChatItem} onPress={onStartMedical} activeOpacity={0.7}>
            <SearchIcon size={20} color={colors.primary[500]} />
            <Text style={[styles.newChatText, { color: colors.primary[500] }]}>Ask a medical question</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newChatItem} onPress={() => onStartNew('note')} activeOpacity={0.7}>
            <ChatWithNoteIcon size={22} />
            <Text style={styles.newChatText}>Chat with a note</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newChatItem} onPress={() => onStartNew('image')} activeOpacity={0.7}>
            <ChatWithImageIcon size={22} />
            <Text style={styles.newChatText}>Chat with an image</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newChatItem} onPress={() => onStartNew('document')} activeOpacity={0.7}>
            <ChatWithDocumentIcon size={22} />
            <Text style={styles.newChatText}>Chat with a document</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.liveSearchRow}>
          <View style={styles.liveSearchTextGroup}>
            <Text style={styles.liveSearchLabel}>Live medical search</Text>
            <Text style={styles.liveSearchHint}>Blend FDA, PubMed & Wikipedia into every chat</Text>
          </View>
          <Switch value={liveSearchEnabled} onValueChange={toggleLiveSearch} />
        </View>

        <Text style={styles.sectionLabel}>Recent</Text>

        {isLoading ? (
          <ActivityIndicator style={styles.loading} color={colors.text.secondary} />
        ) : sessions.length === 0 ? (
          <Text style={styles.emptyText}>No chats yet</Text>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.sessionItem, item._id === activeSessionId && styles.sessionItemActive]}
                onPress={() => onSelectSession(item)}
                onLongPress={() => setSessionForActionSheet(item)}
                delayLongPress={350}
                activeOpacity={0.7}
              >
                {!!item.pinnedAt && <Icon name="bookmarks" size={13} color={colors.primary[500]} />}
                <Text numberOfLines={1} style={styles.sessionTitle}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </Animated.View>

      <ChatActionSheet
        visible={!!sessionForActionSheet}
        chatTitle={sessionForActionSheet?.title ?? ''}
        isPinned={!!sessionForActionSheet?.pinnedAt}
        onClose={() => setSessionForActionSheet(null)}
        onDelete={() => sessionForActionSheet && handleDeleteSession(sessionForActionSheet)}
        onTogglePin={() => sessionForActionSheet && handleToggleSessionPin(sessionForActionSheet)}
      />

      <Toast visible={!!toastMessage} message={toastMessage ?? ''} onHide={() => setToastMessage(null)} />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  backdropTouchable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.background.primary,
    borderRightWidth: 1,
    borderRightColor: colors.border.light,
    zIndex: 11,
    elevation: 11,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[1],
  },
  newChatSection: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingBottom: spacing[2],
  },
  newChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
  },
  newChatText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  liveSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing[3],
  },
  liveSearchTextGroup: {
    flex: 1,
  },
  liveSearchLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  liveSearchHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  loading: {
    marginTop: spacing[4],
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    paddingHorizontal: spacing[4],
  },
  listContent: {
    paddingBottom: spacing[8],
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  sessionItemActive: {
    backgroundColor: colors.background.secondary,
  },
  sessionTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
});
