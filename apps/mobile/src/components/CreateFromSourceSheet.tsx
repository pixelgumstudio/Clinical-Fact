import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon, IconName, theme } from '@clinicalfact/design-system';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import api from '../services/api';
import { CreateQuizModal } from './CreateQuizModal';
import { CreateFlashcardsModal } from './CreateFlashcardsModal';

const SCREEN_WIDTH = Dimensions.get('window').width;

type CreateFromSourceNavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface ChatSessionSummary {
  _id: string;
  title: string;
  createdAt: string;
}

interface SourceOption {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}

interface CreateFromSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  mode: 'quiz' | 'flashcard';
}

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const CreateFromSourceSheet: React.FC<CreateFromSourceSheetProps> = ({
  visible,
  onClose,
  mode,
}) => {
  const navigation = useNavigation<CreateFromSourceNavigationProp>();
  const [, setPanel] = useState<'options' | 'chats'>('options');
  const translateX = useRef(new Animated.Value(0)).current;

  const [chats, setChats] = useState<ChatSessionSummary[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isPreparingChat, setIsPreparingChat] = useState<string | null>(null);

  const [pendingChat, setPendingChat] = useState<{ id: string; title: string; transcript: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (visible) {
      setPanel('options');
      translateX.setValue(0);
    }
  }, [visible]);

  const goToChats = () => {
    setPanel('chats');
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (chats.length === 0) loadChats();
  };

  const loadChats = async () => {
    setIsLoadingChats(true);
    try {
      const response = await api.getChatSessions({ limit: 50 });
      if (response.success && response.data) {
        setChats((response.data.sessions || (response.data as any).data || []) as ChatSessionSummary[]);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const navigateToScreen = (screen: keyof MainStackParamList) => {
    onClose();
    navigation.navigate(screen as any, { intent: mode });
  };

  const handleSelectChat = async (chat: ChatSessionSummary) => {
    if (isPreparingChat) return;
    setIsPreparingChat(chat._id);
    try {
      const response = await api.getChatSession(chat._id);
      if (response.success && response.data) {
        const transcript = (response.data.messages || [])
          .map((m: any) => `${m.role === 'user' ? 'Q' : 'A'}: ${stripHtml(m.content)}`)
          .join('\n\n');
        onClose();
        // Same collision the rest of the app works around — wait for this sheet's native
        // Modal to fully unmount before opening the next one.
        setTimeout(() => {
          setPendingChat({ id: chat._id, title: chat.title, transcript });
        }, 300);
      }
    } catch (error) {
      console.error('Failed to load chat session:', error);
    } finally {
      setIsPreparingChat(null);
    }
  };

  const handleConfirmGenerateQuiz = (questionCount: number, timeInMinutes: number) => {
    if (!pendingChat) return;
    const chat = pendingChat;
    setPendingChat(null);
    navigation.navigate('Quiz', {
      chatTranscript: chat.transcript,
      noteTitle: chat.title,
      questionCount,
      timeInMinutes,
      chatSessionId: chat.id,
    });
  };

  const handleConfirmGenerateFlashcards = async (cardCount: number) => {
    if (!pendingChat) return;
    setIsGenerating(true);
    try {
      const response = await api.generateFlashcardsFromText(
        pendingChat.transcript,
        pendingChat.title,
        cardCount,
        undefined,
        undefined,
        undefined,
        pendingChat.id
      );
      if (response.success && response.data) {
        const fallbackTitle = pendingChat.title;
        setPendingChat(null);
        navigation.navigate('FlashcardReview', {
          setId: response.data._id,
          title: response.data.title || fallbackTitle,
        });
      }
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const options: SourceOption[] = [
    {
      icon: 'chat',
      title: 'Create from chat',
      description: 'Select from one of your recent chat',
      onPress: goToChats,
    },
    {
      icon: 'note',
      title: 'PDF or Document',
      description: `Create a ${mode === 'quiz' ? 'quiz' : 'flashcard set'} from PDF or Document`,
      onPress: () => navigateToScreen('UploadPDF'),
    },
    {
      icon: 'uploadRecordFill',
      title: 'Create from audio',
      description: `Create a ${mode === 'quiz' ? 'quiz' : 'flashcard set'} from upload audio`,
      onPress: () => navigateToScreen('UploadAudio'),
    },
    {
      icon: 'imageFill',
      title: 'Image',
      description: `Create a ${mode === 'quiz' ? 'quiz' : 'flashcard set'} from any image`,
      onPress: () => navigateToScreen('UploadImage'),
    },
    {
      icon: 'textFill',
      title: 'Create from custom text',
      description: `Create a ${mode === 'quiz' ? 'quiz' : 'flashcard set'} from captured text`,
      onPress: () => navigateToScreen('CustomTextInput'),
    },
  ];

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const isToday = date.toDateString() === new Date().toDateString();
      const day = isToday
        ? 'Today'
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `Created ${day}, ${time}`;
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <View style={styles.dragHandle} />
                <Animated.View style={[styles.panelsRow, { transform: [{ translateX }] }]}>
                  {/* Panel 1 — source options */}
                  <View style={styles.panel}>
                    <View style={styles.header}>
                      <Text style={styles.headerTitle}>
                        {mode === 'quiz' ? 'Create Quiz from' : 'Create Flashcards from'}
                      </Text>
                      <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="close" size={20} color={theme.colors.grey[600]} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.optionsList}>
                      {options.map((option) => (
                        <TouchableOpacity
                          key={option.title}
                          style={styles.optionRow}
                          onPress={option.onPress}
                          activeOpacity={0.7}
                        >
                          <View style={styles.optionIcon}>
                            <Icon name={option.icon} size={24} color={theme.colors.yale[900]} />
                          </View>
                          <View style={styles.optionTextGroup}>
                            <Text style={styles.optionTitle}>{option.title}</Text>
                            <Text style={styles.optionDescription}>{option.description}</Text>
                          </View>
                          <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Panel 2 — select from chat */}
                  <View style={styles.panel}>
                    <View style={styles.header}>
                      <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="close" size={20} color={theme.colors.grey[600]} />
                      </TouchableOpacity>
                      <Text style={styles.headerTitle}>Select from chat</Text>
                      <View style={styles.closeButton} />
                    </View>
                    {isLoadingChats ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.yale[700]} />
                      </View>
                    ) : chats.length === 0 ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.emptyText}>No recent chats yet</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={chats}
                        keyExtractor={(item) => item._id}
                        style={styles.chatList}
                        contentContainerStyle={styles.chatListContent}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.optionRow}
                            onPress={() => handleSelectChat(item)}
                            activeOpacity={0.7}
                            disabled={!!isPreparingChat}
                          >
                            <View style={styles.chatIconCircle}>
                              <Icon name="chat" size={20} color={theme.colors.yale[900]} />
                            </View>
                            <View style={styles.optionTextGroup}>
                              <Text style={styles.optionTitle} numberOfLines={1}>{item.title}</Text>
                              <Text style={styles.optionDescription}>{formatDate(item.createdAt)}</Text>
                            </View>
                            {isPreparingChat === item._id ? (
                              <ActivityIndicator size="small" color={theme.colors.grey[400]} />
                            ) : (
                              <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                            )}
                          </TouchableOpacity>
                        )}
                      />
                    )}
                  </View>
                </Animated.View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {mode === 'quiz' ? (
        <CreateQuizModal
          visible={!!pendingChat}
          onClose={() => setPendingChat(null)}
          onGenerateQuiz={handleConfirmGenerateQuiz}
          noteTitle={pendingChat?.title}
        />
      ) : (
        <CreateFlashcardsModal
          visible={!!pendingChat}
          onClose={() => setPendingChat(null)}
          onGenerateFlashcards={handleConfirmGenerateFlashcards}
          isGenerating={isGenerating}
          noteTitle={pendingChat?.title}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 22, 39, 0.35)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius['3xl'],
    borderTopRightRadius: theme.borderRadius['3xl'],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[8],
    height: '75%',
    overflow: 'hidden',
  },
  dragHandle: {
    width: 60,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[50],
    alignSelf: 'center',
    marginBottom: theme.spacing[3],
  },
  panelsRow: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 2,
    flex: 1,
  },
  panel: {
    width: SCREEN_WIDTH,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[4],
  },
  headerTitle: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    paddingHorizontal: theme.spacing[5],
    gap: theme.spacing[4],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatIconCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextGroup: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  optionDescription: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: theme.spacing[5],
    gap: theme.spacing[4],
    paddingBottom: theme.spacing[4],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
  },
});
