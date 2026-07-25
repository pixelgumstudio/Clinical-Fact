import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Clipboard,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RichText } from '../../components/RichText';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import appLifecycleService from '../../services/appLifecycleService';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  SendMessageIcon,
  DocumentPreviewSmallIcon,
  ImagePreviewSmallIcon,
  NoteFilePreviewIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useGatedFeature } from '../../hooks/useGatedFeature';
import { CustomAlertModal } from '../../components/CustomAlertModal';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useAuthStore } from '../../store/authStore';
import { showInAppPaywall } from '../../services/revenuecat';

type ChatConversationRouteProp = RouteProp<MainStackParamList, 'ChatConversation'>;
type ChatConversationNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ChatConversation'>;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Animated typing dots component
const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (dot: Animated.Value) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
    marginHorizontal: 2,
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={styles.messageContainer}>
      <View style={styles.typingBubble}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
};

export const ChatConversationScreen = () => {
  const navigation = useNavigation<ChatConversationNavigationProp>();
  const route = useRoute<ChatConversationRouteProp>();
  const { chatId, noteId, title, type, fileName } = route.params;
  const insets = useSafeAreaInsets();
  const { withAccess } = useGatedFeature();
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);
  const user = useAuthStore((s) => s.user);

  const isLocked = !hasAccess && (user?.freeUsage?.chats?.count ?? 0) >= 1;

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttonText: string;
    onButtonPress?: () => void;
  }>({ visible: false, title: '', message: '', buttonText: 'OK' });

  const showAlert = (title: string, message: string, buttonText = 'OK', onButtonPress?: () => void) =>
    setAlertConfig({ visible: true, title, message, buttonText, onButtonPress });
  const closeAlert = () => setAlertConfig((prev) => ({ ...prev, visible: false }));

  const [message, setMessage] = useState('');
  const [deepResearchMode, setDeepResearchMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(chatId || null);
  const [chatTitle, setChatTitle] = useState(fileName || title || 'Chat');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<string>('pending');
  const [embeddingProgress, setEmbeddingProgress] = useState(0);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const embeddingPollCancelRef = useRef<{ cancelled: boolean } | null>(null);
  const sseChatCleanupRef = useRef<(() => void) | null>(null);
  const invertedMessages = [...messages];

  useEffect(() => {
    initializeChat();
    return () => {
      if (embeddingPollCancelRef.current) embeddingPollCancelRef.current.cancelled = true;
      sseChatCleanupRef.current?.();
    };
  }, []);

  const initializeChat = async () => {
    try {
      setIsLoadingSession(true);

      if (chatId) {
        const response = await api.getChatSession(chatId);

        if (response.success && response.data) {
          setSessionId(response.data._id);
          setEmbeddingStatus(response.data.embeddingStatus);
          setEmbeddingProgress(response.data.embeddingProgress);
          if (response.data.title) setChatTitle(response.data.title);

          const loadedMessages: Message[] = response.data.messages.map((msg: any) => ({
            id: msg._id || `${msg.role}-${msg.timestamp}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(loadedMessages);

          if (response.data.embeddingStatus === 'processing') {
            pollEmbeddingStatus(response.data._id);
          }
        }
      } else if (noteId) {
        const response = await api.createChatSessionFromNote(noteId);

        if (response.success && response.data) {
          setSessionId(response.data._id);
          setEmbeddingStatus(response.data.embeddingStatus);
          setEmbeddingProgress(response.data.embeddingProgress);
          if (response.data.title) setChatTitle(response.data.title);
          pollEmbeddingStatus(response.data._id);
        } else {
          throw new Error(response.message || 'Failed to create chat session');
        }
      }
    } catch (error: any) {
      console.error('Failed to initialize chat:', error);
      // 🛡️ The Backend Interceptor
        if (error.message && (error.message.includes('limit reached') || error.message.includes('Free trial'))) {
          // 1. Send them out of the broken chat screen
          navigation.goBack(); 
          
          // 2. Wait for the screen transition, then slide up the paywall
          setTimeout(async () => {
            try {
              await showInAppPaywall();
            } catch (paywallError) {
              console.error('Paywall failed to open:', paywallError);
            }
          }, 500);
        } else {
          // If it's a REAL network error (not a limit error), show the normal alert
          showAlert('Error', error.message || 'Failed to initialize chat session');
        }
      } finally {
        setIsLoadingSession(false);
      }
  };

  const pollEmbeddingStatus = (sid: string) => {
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // 60 × 2s = 120s max
    const token = { cancelled: false };
    embeddingPollCancelRef.current = token;

    const poll = async () => {
      if (token.cancelled || attempts >= MAX_ATTEMPTS) return;
      attempts++;
      try {
        const response = await api.getChatSession(sid);
        if (token.cancelled) return;
        if (response.success && response.data) {
          setEmbeddingStatus(response.data.embeddingStatus);
          setEmbeddingProgress(response.data.embeddingProgress);
          if (
            response.data.embeddingStatus === 'completed' ||
            response.data.embeddingStatus === 'failed'
          ) return;
        } else {
          return;
        }
      } catch {
        return;
      }
      setTimeout(poll, 2000);
    };

    setTimeout(poll, 2000);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleOpenRename = () => {
    setRenameValue(chatTitle);
    setIsRenameModalVisible(true);
  };

  const handleSaveRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !sessionId) {
      setIsRenameModalVisible(false);
      return;
    }

    try {
      const response = await api.updateChatSession(sessionId, { title: trimmed });
      if (response.success) {
        setChatTitle(trimmed);
      }
    } catch (error) {
      console.error('Failed to rename chat:', error);
    } finally {
      setIsRenameModalVisible(false);
    }
  };

  const listenChatJob = (jobId: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const cleanup = api.listenToJobStream(
        jobId,
        (data) => {
          sseChatCleanupRef.current = null;
          if (data.status === 'failed') {
            reject(new Error(data.error || 'Failed to get AI response.'));
          } else {
            const aiResponse: Message = {
              id: `ai-${Date.now()}`,
              role: 'assistant',
              content: data.result.response,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiResponse]);
            resolve();
          }
        },
        () => {
          sseChatCleanupRef.current = null;
          reject(new Error('Connection error. Please try again.'));
        },
        3 * 60 * 1000
      );
      sseChatCleanupRef.current = cleanup;
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !sessionId) return;

    if (embeddingStatus !== 'completed') {
      showAlert('Processing Document', 'Please wait while we process your document. This usually takes a few seconds.');
      return;
    }

    const msgContent = message.trim();
    const tempId = `temp-${Date.now()}`;
    const userMessage: Message = {
      id: tempId,
      role: 'user',
      content: msgContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage('');

    typingTimerRef.current = setTimeout(() => {
      setIsSendingMessage(true);
    }, 80);

    try {
      const response = await api.sendChatMessage(sessionId, msgContent, deepResearchMode);

      if (!response.success || !response.data?.jobId) {
        throw new Error(response.message || 'Failed to start message processing');
      }

      // Track in-flight chat message job for background processing
      await appLifecycleService.trackInFlightJob(response.data.jobId, 'chat');

      await listenChatJob(response.data.jobId);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      showAlert('Error', error.message || 'Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      setIsSendingMessage(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question);
  };

  const getFileIcon = () => {
    switch (type) {
      case 'note': return '📄';
      case 'image': return '🖼️';
      case 'document':
      case 'pdf': return '📑';
      default: return '📄';
    }
  };

  const stripHtml = (html: string) =>
    html
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const handleCopyMessage = (content: string) => {
    Clipboard.setString(stripHtml(content));
    showAlert('Copied', 'Message copied to clipboard');
  };

  const handleRegenerateResponse = async (messageIndex: number) => {
    if (!sessionId) return;

    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || userMessageIndex >= messages.length) return;

    const userMessage = messages[userMessageIndex];
    const priorMessages = messages.slice(0, messageIndex);
    setMessages(priorMessages);
    setIsSendingMessage(true);

    const tempId = `regen-${Date.now()}`;

    try {
      const response = await api.sendChatMessage(sessionId, userMessage.content);

      if (!response.success || !response.data?.jobId) {
        throw new Error(response.message || 'Failed to regenerate response');
      }

      // Track in-flight chat message job for background processing
      await appLifecycleService.trackInFlightJob(response.data.jobId, 'chat');

      await listenChatJob(response.data.jobId);
    } catch (error: any) {
      showAlert('Error', 'Failed to regenerate response');
      setMessages(messages);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        {isUser ? (
          <View style={styles.userMessage}>
            <Text style={styles.userMessageText}>{item.content}</Text>
          </View>
        ) : (
          <View>
            <View style={styles.assistantMessage}>
              <RichText content={item.content} />
            </View>
            <View style={styles.messageActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleCopyMessage(item.content)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleRegenerateResponse(index)}
                activeOpacity={0.7}
                disabled={isSendingMessage}
              >
                <Text style={styles.actionIcon}>🔄</Text>
                <Text style={styles.actionText}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyChat = () => {
    if (isLoadingSession) {
      return (
        <View style={styles.emptyChat}>
          <ActivityIndicator size="large" color={colors.neutral[900]} />
          <Text style={styles.emptyText}>Initializing chat...</Text>
        </View>
      );
    }

    if (embeddingStatus === 'processing') {
      return (
        <View style={styles.emptyChat}>
          <View style={styles.attachedDocument}>
            <View style={styles.attachedDocumentIcon}>
              {type === 'note' && <NoteFilePreviewIcon size={48} />}
              {type === 'image' && <ImagePreviewSmallIcon size={48} color="#F97316" />}
              {type === 'document' && <DocumentPreviewSmallIcon size={48} color="#F97316" />}
            </View>
            <View style={styles.attachedDocumentInfo}>
              <Text style={styles.attachedDocumentTitle} numberOfLines={2}>
                {fileName || title}
              </Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${embeddingProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>{embeddingProgress}%</Text>
              </View>
              <Text style={styles.embeddingStatusText}>
                {type === 'image' ? 'Extracting text from image...' :
                 type === 'document' ? 'Processing PDF document...' :
                 'Analyzing your note...'}
              </Text>
            </View>
          </View>
          <View style={styles.processingInfo}>
            <Text style={styles.processingInfoText}>
              ⏱️ This usually takes just a few seconds. You'll be able to chat once processing is complete.
            </Text>
          </View>
        </View>
      );
    }

    if (embeddingStatus === 'failed') {
      return (
        <View style={styles.emptyChat}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>Processing Failed</Text>
            <Text style={styles.errorSubtext}>
              We couldn't process this {type === 'note' ? 'note' : type === 'image' ? 'image' : 'document'}.
              This might be due to:
            </Text>
            <View style={styles.errorReasons}>
              <Text style={styles.errorReason}>• File might be corrupted or unreadable</Text>
              <Text style={styles.errorReason}>• {type === 'image' ? 'Image quality too low' : type === 'document' ? 'PDF is password-protected' : 'Content format not supported'}</Text>
              <Text style={styles.errorReason}>• Network connection issue</Text>
            </View>
            <TouchableOpacity style={styles.errorButton} onPress={handleGoBack}>
              <Text style={styles.errorButtonText}>Try a Different File</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.emptyChat}>
        <View style={styles.attachedDocument}>
          <View style={styles.attachedDocumentIcon}>
            {type === 'note' && <NoteFilePreviewIcon size={40} />}
            {type === 'image' && <ImagePreviewSmallIcon size={40} color="#3B82F6" />}
            {type === 'document' && <DocumentPreviewSmallIcon size={40} color="#3B82F6" />}
          </View>
          <View style={styles.attachedDocumentInfo}>
            <Text style={styles.attachedDocumentTitle} numberOfLines={2}>
              {fileName || title}
            </Text>
            <View style={styles.readyBadge}>
              <Text style={styles.readyBadgeText}>✓ Ready to chat</Text>
            </View>
          </View>
        </View>
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            💡 Ask me anything about this {type === 'note' ? 'note' : type === 'image' ? 'image' : 'document'}. I can summarize, explain concepts, or answer specific questions.
          </Text>
        </View>
      </View>
    );
  };

  const getSuggestedQuestions = () => {
    switch (type) {
      case 'note':
        return ['Summarize this note for me', 'What are the main topics covered?', 'Create a quiz from this content'];
      case 'image':
        return ['What text is in this image?', 'Summarize the content', 'Explain what you see'];
      case 'document':
        return ['Give me a brief summary', 'What are the key points?', 'Explain the main concepts'];
      default:
        return ['Summarize the main points', 'What are the key takeaways?', 'Explain this in simple terms'];
    }
  };

  const suggestedQuestions = getSuggestedQuestions();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeftIcon size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={handleOpenRename} activeOpacity={0.7}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatTitle}
          </Text>
          {embeddingStatus === 'completed' && (
            <View style={styles.headerStatusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.headerSubtitle}>Ready · tap to rename</Text>
            </View>
          )}
          {embeddingStatus === 'processing' && (
            <View style={styles.headerStatusBadge}>
              <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={[styles.headerSubtitle, { color: '#F59E0B' }]}>Processing {embeddingProgress}%</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={invertedMessages}
          // inverted
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyMessagesList,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyChat}
          ListFooterComponent={isSendingMessage ? <TypingIndicator /> : null}
        />

        {/* Suggested questions */}
        {messages.length === 0 && embeddingStatus === 'completed' && (
          <View style={styles.suggestedSection}>
            <Text style={styles.suggestedTitle}>💬 Try asking:</Text>
            <View style={styles.suggestedContainer}>
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestedButton}
                  onPress={() => handleSuggestedQuestion(question)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestedText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input area */}
        {isLocked ? (
        // The Locked State UI
        <Pressable 
          onPress={() => showInAppPaywall()}
          style={{
            marginHorizontal: 16,
            marginBottom: insets.bottom > 0 ? insets.bottom : 16,
            padding: 16,
            backgroundColor: '#1A1A1A', // Dark premium background
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#FFD700', // Gold border for Pro
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: 'bold' }}>
           Upgrade to Pro to continue chatting
          </Text>
        </Pressable>
      ) :
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
          {/* Deep research mode banner */}
          {deepResearchMode && (
            <View style={styles.deepResearchBanner}>
              <Text style={styles.deepResearchBannerIcon}>🔍</Text>
              <Text style={styles.deepResearchBannerText}>
                Deep Research on — AI will use both your document and its broader knowledge to answer
              </Text>
            </View>
          )}

          {/* Main input row */}
          <View style={[styles.inputRow, isInputFocused && styles.inputRowFocused]}>
            <TextInput
              style={styles.textInput}
              placeholder={
                embeddingStatus === 'completed'
                  ? 'Ask anything about this document...'
                  : type === 'image' ? 'Extracting text...' :
                    type === 'document' ? 'Processing PDF...' :
                    'Processing...'
              }
              placeholderTextColor={colors.text.tertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              editable={embeddingStatus === 'completed' && !isSendingMessage}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
            />
            {message.length > 800 && (
              <Text style={styles.characterCount}>{message.length}/1000</Text>
            )}
          </View>

          {/* Bottom toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.toolbarLeft}>
              {/* Deep Research toggle button */}
              <TouchableOpacity
                style={[styles.contextButton, deepResearchMode && styles.deepResearchButtonActive]}
                onPress={() => setDeepResearchMode((v) => !v)}
                activeOpacity={0.7}
                disabled={embeddingStatus !== 'completed' || isSendingMessage}
              >
                <Text style={[styles.contextButtonText, deepResearchMode && styles.deepResearchButtonTextActive]}>
                  {deepResearchMode ? '✕ Research' : '🔍 Deep Research'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.attachedFileText} numberOfLines={1}>
                {getFileIcon()} {fileName || title}
              </Text>
            </View>
            <TouchableOpacity
  style={[
    styles.sendButton,
    (!message.trim() || embeddingStatus !== 'completed' || isSendingMessage) && styles.sendButtonDisabled,
  ]}
  onPress={() => withAccess(handleSendMessage)}
  disabled={!message.trim() || embeddingStatus !== 'completed' || isSendingMessage}
>
              {isSendingMessage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <SendMessageIcon size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
  }
      </KeyboardAvoidingView>

<CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText}
        onClose={closeAlert}
        onButtonPress={alertConfig.onButtonPress}
      />

      {/* Rename Modal */}
      <Modal
        visible={isRenameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsRenameModalVisible(false)}
        >
          <TouchableOpacity style={styles.renameModal} activeOpacity={1}>
            <Text style={styles.renameTitle}>Rename Chat</Text>
            <TextInput
              style={styles.renameInput}
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              selectTextOnFocus
              maxLength={100}
              returnKeyType="done"
              onSubmitEditing={handleSaveRename}
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={styles.renameCancelButton}
                onPress={() => setIsRenameModalVisible(false)}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.renameSaveButton}
                onPress={handleSaveRename}
              >
                <Text style={styles.renameSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing[1],
    marginRight: spacing[2],
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  headerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    color: '#10B981',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  emptyMessagesList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyChat: {
    paddingTop: spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    alignSelf: 'flex-start',
    marginVertical: spacing[2],
    minWidth: 64,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing[2],
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: '#DC2626',
    marginBottom: spacing[2],
  },
  errorSubtext: {
    fontSize: typography.fontSize.sm,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: spacing[3],
    lineHeight: 20,
  },
  errorReasons: {
    alignSelf: 'stretch',
    marginBottom: spacing[4],
  },
  errorReason: {
    fontSize: typography.fontSize.sm,
    color: '#7F1D1D',
    marginBottom: spacing[1],
    lineHeight: 20,
  },
  errorButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  attachedDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#BFDBFE',
    width: '100%',
    maxWidth: 280,
  },
  attachedDocumentIcon: {
    marginRight: spacing[2],
  },
  attachedDocumentInfo: {
    flex: 1,
  },
  attachedDocumentTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#1E40AF',
    marginBottom: 0,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: spacing[2],
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    width: 35,
  },
  embeddingStatusText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  readyBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: spacing[1],
  },
  readyBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#059669',
  },
  hintContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing[3],
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    color: '#6B7280',
    lineHeight: 20,
  },
  processingInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing[3],
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  processingInfoText: {
    fontSize: typography.fontSize.sm,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
  },
  messageContainer: {
    marginVertical: spacing[2],
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  userMessage: {
    backgroundColor: '#F97316',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    maxWidth: '80%',
  },
  userMessageText: {
    fontSize: typography.fontSize.base,
    color: colors.text.inverse,
    lineHeight: 22,
  },
  assistantMessage: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    maxWidth: '90%',
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
    paddingLeft: spacing[2],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  actionIcon: {
    fontSize: 14,
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  suggestedSection: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  suggestedTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  suggestedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  suggestedButton: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.border.main,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestedText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  inputContainer: {
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.main,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 5,
  },
  deepResearchBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3FF',
    borderRadius: 10,
    padding: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: spacing[2],
  },
  deepResearchBannerIcon: {
    fontSize: 14,
  },
  deepResearchBannerText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: '#5B21B6',
    lineHeight: 18,
  },
  inputRow: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.border.main,
    minHeight: 44,
  },
  inputRowFocused: {
    borderColor: '#F97316',
  },
  textInput: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    maxHeight: 100,
    padding: 0,
    flex: 1,
  },
  characterCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    alignSelf: 'flex-end',
    marginTop: spacing[1],
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[1],
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing[2],
    gap: spacing[2],
  },
  contextButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deepResearchButtonActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#C4B5FD',
  },
  contextButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  deepResearchButtonTextActive: {
    color: '#6D28D9',
  },
  attachedFileText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  sendButton: {
    backgroundColor: '#F97316',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  // Rename modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  renameModal: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing[5],
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  renameTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  renameInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.border.main,
    marginBottom: spacing[4],
  },
  renameButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  renameCancelButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  renameCancelText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  renameSaveButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: 10,
  },
  renameSaveText: {
    fontSize: typography.fontSize.base,
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.semibold,
  },
});
