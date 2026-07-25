import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  colors,
  spacing,
  typography,
  NotechatLogoIcon,
  ChatWithNoteIcon,
  ChatWithImageIcon,
  ChatWithDocumentIcon,
  ChevronRightIcon,
  MoreVerticalIcon,
  FolderIcon,
  DeleteIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { CreateChatModal } from '../../components/CreateChatModal';
import { ChatOptionsModal } from '../../components/ChatOptionsModal';
import { FoldersModal } from '../../components/FoldersModal';
import api from '../../services/api';
import { useGatedFeature } from '../../hooks/useGatedFeature';

type ChatsNavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface ChatSession {
  _id: string;
  title: string;
  sourceType: 'note' | 'image' | 'document' | 'pdf';
  createdAt: string;
  folderId?: string;
  noteId?: string;
  fileId?: string;
}

interface Folder {
  _id: string;
  name: string;
  color: string;
  chatCount?: number;
}

export const ChatsScreen = () => {
  const navigation = useNavigation<ChatsNavigationProp>();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const { withAccess } = useGatedFeature();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [foldersVisible, setFoldersVisible] = useState(false);

  const isFetchingRef = React.useRef(false);
  const hasLoadedRef = React.useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      const isRefresh = hasLoadedRef.current;
      hasLoadedRef.current = true;
      loadData(isRefresh);
    }, [])
  );

  const loadData = async (refresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Fetch folders and chat sessions in parallel
      const [foldersResponse, chatsResponse] = await Promise.all([
        api.getFolders(),
        api.getChatSessions({ limit: 100, page: 1 }),
      ]);

      if (foldersResponse.success && foldersResponse.data) {
        const foldersData = foldersResponse.data.folders || foldersResponse.data;

        // Count chats in each folder
        const chatsData = chatsResponse.success && chatsResponse.data
          ? (chatsResponse.data.sessions || (chatsResponse.data as any).data || [])
          : [];

        const foldersWithCounts = foldersData.map((folder: Folder) => ({
          ...folder,
          chatCount: chatsData.filter((chat: ChatSession) => chat.folderId === folder._id).length,
        }));

        setFolders(foldersWithCounts);
      }

      if (chatsResponse.success && chatsResponse.data) {
        const sessions = chatsResponse.data.sessions || (chatsResponse.data as any).data || [];
        setChatSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to load chat data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  };


  const handleCreateChat = () => {
    withAccess(() => setCreateModalVisible(true));
  };

  const handleCloseModal = () => {
    setCreateModalVisible(false);
  };

  const handleSelectChatType = (type: 'note' | 'image' | 'document') => {
    setCreateModalVisible(false);
    navigation.navigate('ChatFileSelect', { type });
  };

  const handleChatItemPress = (item: ChatSession) => {
    navigation.navigate('ChatConversation', {
      chatId: item._id,
      title: item.title,
      type: item.sourceType === 'pdf' ? 'document' : item.sourceType,
      noteId: item.noteId,
    });
  };

  const handleFolderPress = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleMore = (item: ChatSession) => {
    setActiveChat(item);
    setOptionsVisible(true);
  };

  const handleDeleteChat = (chatId: string, chatTitle: string) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${chatTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteChatSession(chatId);
              if (response.success) {
                setChatSessions(prev => prev.filter(chat => chat._id !== chatId));
                loadData(true);
              } else {
                Alert.alert('Error', response.message || 'Failed to delete chat');
              }
            } catch (error: any) {
              console.error('Failed to delete chat:', error);
              Alert.alert('Error', 'Failed to delete chat session');
            }
          },
        },
      ]
    );
  };

  const handleOptionsDelete = () => {
    if (!activeChat) return;
    setOptionsVisible(false);
    handleDeleteChat(activeChat._id, activeChat.title);
  };

  const handleMoveToFolder = () => {
    setOptionsVisible(false);
    setFoldersVisible(true);
  };

  const handleDeleteFolder = (folder: Folder) => {
    Alert.alert(
      'Delete Folder?',
      'Are you sure? Chats inside will not be deleted, just moved to All Chats.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteFolder(folder._id);
              if (response.success) {
                if (selectedFolderId === folder._id) setSelectedFolderId(null);
                setFolders(prev => prev.filter(f => f._id !== folder._id));
              } else {
                Alert.alert('Error', response.message || 'Failed to delete folder');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete folder');
            }
          },
        },
      ]
    );
  };

  const handleSelectFolder = async (folderId: string | null) => {
    setFoldersVisible(false);
    if (!activeChat) return;
    try {
      const response = await api.moveChatToFolder(activeChat._id, folderId);
      if (response.success) {
        loadData(true);
      } else {
        Alert.alert('Error', response.message || 'Failed to move chat');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to move chat');
    }
  };

  // Filter chats by selected folder
  const filteredChats = selectedFolderId
    ? chatSessions.filter(chat => chat.folderId === selectedFolderId)
    : chatSessions;

  const allChatsCount = chatSessions.length;
  const hasChats = chatSessions.length > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderChatOption = (
    icon: JSX.Element,
    title: string,
    type: 'note' | 'image' | 'document'
  ) => (
    <TouchableOpacity
      style={styles.optionItem}
      onPress={() => handleSelectChatType(type)}
      activeOpacity={0.7}
    >
      <View>{icon}</View>
      <Text style={styles.optionText}>{title}</Text>
      <ChevronRightIcon size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  const renderRightActions = (item: ChatSession) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteChat(item._id, item.title)}
        activeOpacity={0.7}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderChatItem = ({ item }: { item: ChatSession }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
    >
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.chatItemIcon}>
          {(item.sourceType === 'note') && <ChatWithNoteIcon size={32} />}
          {item.sourceType === 'image' && <ChatWithImageIcon size={32} />}
          {(item.sourceType === 'document' || item.sourceType === 'pdf') && <ChatWithDocumentIcon size={32} />}
        </View>
        <View style={styles.chatItemContent}>
          <Text style={styles.chatItemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.chatItemDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleMore(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          style={styles.moreButton}
        >
          <MoreVerticalIcon size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderFolderItem = (folder: Folder | { _id: null; name: string; chatCount: number }) => {
    const isSelected = folder._id === selectedFolderId;
    const folderColor = folder._id ? (folder as Folder).color : undefined;

    return (
      <TouchableOpacity
        key={folder._id || 'all'}
        style={[styles.folderItem, isSelected && styles.folderItemSelected]}
        onPress={() => handleFolderPress(folder._id)}
        onLongPress={folder._id ? () => handleDeleteFolder(folder as Folder) : undefined}
        activeOpacity={0.7}
      >
        <View style={styles.folderItemLeft}>
          <FolderIcon size={20} color={folderColor || '#9CA3AF'} />
          <Text style={[styles.folderItemText, isSelected && styles.folderItemTextSelected]}>
            {folder.name}
          </Text>
        </View>
        <View style={[styles.folderCount, isSelected && styles.folderCountSelected]}>
          <Text style={[styles.folderCountText, isSelected && styles.folderCountTextSelected]}>
            {folder.chatCount || 0}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateChat}>
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.neutral[900]} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : hasChats ? (
        <View style={styles.content}>
          {/* Folders Section */}
          <View style={styles.foldersSection}>
            <Text style={styles.sectionTitle}>Folders</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.foldersScroll}
            >
              {/* All Chats */}
              {renderFolderItem({ _id: null, name: 'All Chats', chatCount: allChatsCount })}

              {/* User Folders */}
              {folders.map((folder) => renderFolderItem(folder))}
            </ScrollView>
          </View>

          {/* Chats List */}
          <FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.chatsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadData(true)}
                tintColor={colors.neutral[900]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {selectedFolderId
                    ? 'No chats in this folder'
                    : 'No chats yet'}
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        // Show empty state with options
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              tintColor={colors.neutral[900]}
            />
          }
        >
          {/* Notechat Branding */}
          <View style={styles.brandingContainer}>
            <NotechatLogoIcon size={64} />
            <Text style={styles.brandingTitle}>Notechat</Text>
            <Text style={styles.brandingSubtitle}>
              Chat directly with your files all in one place, click on{'\n'}
              the button above to get started or use the{'\n'}
              options below
            </Text>
          </View>

          {/* Chat Options */}
          <View style={styles.optionsContainer}>
            {renderChatOption(
              <ChatWithNoteIcon size={40} />,
              'Chat with any note',
              'note'
            )}
            {renderChatOption(
              <ChatWithImageIcon size={40} />,
              'Chat with any image',
              'image'
            )}
            {renderChatOption(
              <ChatWithDocumentIcon size={40} />,
              'Chat with any document',
              'document'
            )}
          </View>
        </ScrollView>
      )}

      {/* Create Chat Modal */}
      <CreateChatModal
        visible={isCreateModalVisible}
        onClose={handleCloseModal}
        onSelectType={handleSelectChatType}
      />

      <ChatOptionsModal
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onMoveToFolder={handleMoveToFolder}
        onDeleteChat={handleOptionsDelete}
      />

      <FoldersModal
        visible={foldersVisible}
        onClose={() => setFoldersVisible(false)}
        onSelectFolder={handleSelectFolder}
        folders={folders}
        selectedFolderId={activeChat?.folderId}
        folderType="chat"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  createButton: {
    backgroundColor: colors.neutral[900],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing[12],
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  foldersSection: {
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    paddingHorizontal: spacing[5],
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  foldersScroll: {
    paddingHorizontal: spacing[5],
    gap: spacing[2],
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 120,
  },
  folderItemSelected: {
    backgroundColor: colors.neutral[900],
    borderColor: colors.neutral[900],
  },
  folderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  folderItemText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  folderItemTextSelected: {
    color: '#FFFFFF',
  },
  folderCount: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  folderCountSelected: {
    backgroundColor: '#FFFFFF20',
  },
  folderCountText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  folderCountTextSelected: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  brandingContainer: {
    alignItems: 'center',
    paddingTop: spacing[12],
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  brandingTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  brandingSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsContainer: {
    paddingTop: spacing[4],
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  optionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginLeft: spacing[3],
  },
  chatsList: {
    paddingTop: spacing[2],
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  chatItemIcon: {
    marginRight: spacing[3],
  },
  chatItemContent: {
    flex: 1,
  },
  chatItemTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  chatItemDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  moreButton: {
    padding: spacing[1],
    marginLeft: spacing[1],
  },
  emptyState: {
    paddingTop: spacing[12],
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
