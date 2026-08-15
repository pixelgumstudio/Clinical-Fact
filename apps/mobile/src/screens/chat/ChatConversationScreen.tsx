import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Image,
  ScrollView,
  Linking,
  LayoutAnimation,
  UIManager,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RichText } from '../../components/RichText';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api, { MedicalChatFilters, MedicalChatSource, MedicalChatImage, MedicalChatGroundingSource } from '../../services/api';
import appLifecycleService from '../../services/appLifecycleService';
import {
  colors,
  spacing,
  typography,
  SendMessageIcon,
  DocumentPreviewSmallIcon,
  ImagePreviewSmallIcon,
  NoteFilePreviewIcon,
  FilterIcon,
  RegenerateIcon,
  Icon,
  theme,
  Switch as DSSwitch,
} from '@clinicalfact/design-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useGatedFeature } from '../../hooks/useGatedFeature';
// Sidebar disabled — logo now navigates to the chat list instead of opening it.
// import { ChatSidebar, ChatSessionSummary } from '../../components/ChatSidebar';
import { CustomAlertModal } from '../../components/CustomAlertModal';
import { Toast } from '../../components/Toast';
import { MedicalFilterModal } from '../../components/MedicalFilterModal';
import { CreateQuizModal } from '../../components/CreateQuizModal';
import { CreateFlashcardsModal } from '../../components/CreateFlashcardsModal';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useAuthStore } from '../../store/authStore';
import { useMedicalSearchStore } from '../../store/medicalSearchStore';
import { showInAppPaywall } from '../../services/revenuecat';

type ChatConversationRouteProp = RouteProp<MainStackParamList, 'ChatConversation'>;
type ChatConversationNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ChatConversation'>;

// LayoutAnimation is opt-in on Android (iOS has it on by default) — enables the smooth
// insert animation used below whenever a new message is added to the list.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: MedicalChatSource[];
  images?: MedicalChatImage[];
  groundingSources?: MedicalChatGroundingSource[];
  /** The attached image's URL, shown as a tappable thumbnail on the bubble. On the optimistic
   *  send it's the local device URI; once loaded from history it's the server-resolved
   *  (presigned) URL — same field either way, since both render identically. */
  attachedImageUri?: string;
}

/** An image or document picked via the "+" sheet, uploaded in the background, and shown as a
 *  removable thumbnail above the composer until the user sends (or removes) it. */
interface PendingAttachment {
  uri: string;
  fileName: string;
  kind: 'image' | 'document';
  fileId?: string;
  isUploading: boolean;
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

// Confirmed 2026-07-29 — replaces the old Gemini-style "Hi, what's on your mind?"
// greeting with the branded hero + starter-topic cards shown when a new chat is
// created with no session yet.
const CHAT_WELCOME_TOPICS = [
  { emoji: '🔋', label: 'Electrolyte imbalance explained', question: 'Explain electrolyte imbalance — causes, symptoms, and treatment' },
  { emoji: '🩵', label: 'ECG interpretation basics', question: 'What are the basics of ECG interpretation?' },
  { emoji: '💊', label: 'Common drug interactions to know', question: 'What are some common and important drug interactions I should know?' },
  { emoji: '🫀', label: 'NCLEX-style practice topics', question: 'Give me an NCLEX-style practice question' },
];

const ChatWelcomeHero: React.FC<{ onSelectTopic: (question: string) => void }> = ({ onSelectTopic }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.welcomeContainer, { opacity, transform: [{ scale }] }]}>
      <View style={styles.welcomeLogoRow}>
        <Icon name="logo" size={36} />
        <Text style={styles.welcomeWordmark}>Clinicalfact</Text>
      </View>
      <Text style={styles.welcomeTagline}>
        Ask anything medical, Get the{'\n'}Cited fact backed by real sources
      </Text>
      <Text style={styles.welcomeSubtitle}>Evidence-based · PubMed sources · Peer-reviewed</Text>

      <Text style={styles.welcomeTopicsLabel}>Try out any of this topics to get started</Text>
      <View style={styles.welcomeTopicsList}>
        {CHAT_WELCOME_TOPICS.map((topic) => (
          <TouchableOpacity
            key={topic.label}
            style={styles.welcomeTopicCard}
            onPress={() => onSelectTopic(topic.question)}
            activeOpacity={0.7}
          >
            <View style={styles.welcomeTopicTop}>
              <View style={styles.welcomeTopicIcon}>
                <Text style={styles.welcomeTopicEmoji}>{topic.emoji}</Text>
              </View>
              <Icon name="foward" size={16} color={theme.colors.grey[200]} />
            </View>
            <Text style={styles.welcomeTopicText}>{topic.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

export const ChatConversationScreen = () => {
  const navigation = useNavigation<ChatConversationNavigationProp>();
  const route = useRoute<ChatConversationRouteProp>();
  const { chatId, noteId, title, type, fileName } = route.params || {};
  const insets = useSafeAreaInsets();
  const { withAccess } = useGatedFeature();
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);
  const user = useAuthStore((s) => s.user);
  // Global switch (set from the chat drawer) — when on, blends live FDA/PubMed/Wikipedia
  // search into every chat's responses, not just dedicated medical_qa sessions.
  const liveSearchEnabled = useMedicalSearchStore((s) => s.liveSearchEnabled);
  const toggleLiveSearch = useMedicalSearchStore((s) => s.toggleLiveSearch);
  const [isPinned, setIsPinned] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [citationsSheetSources, setCitationsSheetSources] = useState<MedicalChatSource[] | null>(null);
  // Commented out (not deleted) rather than the "•••" options menu it drove — replaced by a
  // direct "advanced filters" header icon below, but kept in case the menu is needed again.
  // const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<MedicalChatImage | null>(null);

  // Stateful, not derived directly from route params: when the user types straight into the
  // welcome screen (no session yet), handleSendMessage auto-creates a medical_qa session and
  // flips this to true — route params alone would stay stuck at whatever the screen mounted
  // with, which would silently misroute the very first message to the wrong chat mode.
  const [isMedical, setIsMedical] = useState(type === 'medical_qa');
  // ⚠️ DEV MODE: raised to match the temporarily-unlimited server quota (quota.config.ts).
  // Revert to `>= 1` before going live.
  const isLocked = !isMedical && !hasAccess && (user?.freeUsage?.chats?.count ?? 0) >= 999;
  const [medicalFilters, setMedicalFilters] = useState<MedicalChatFilters>({});
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  // "Add to chat" sheet — full-screen-style bottom sheet (slide up), replacing the old
  // small popover. attachMenuTranslateY drives the sheet itself; attachMenuOpacity fades
  // the backdrop in sync, same easing convention as ChatSidebar's slide-in.
  const [isAttachMenuVisible, setIsAttachMenuVisible] = useState(false);
  const attachMenuTranslateY = useRef(new Animated.Value(400)).current;
  const attachMenuOpacity = useRef(new Animated.Value(0)).current;
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  useEffect(() => {
    if (isAttachMenuVisible) {
      attachMenuTranslateY.setValue(400);
      attachMenuOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(attachMenuTranslateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(attachMenuOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [isAttachMenuVisible, attachMenuTranslateY, attachMenuOpacity]);

  const closeAttachMenu = (onComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(attachMenuTranslateY, { toValue: 400, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(attachMenuOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setIsAttachMenuVisible(false);
      onComplete?.();
    });
  };

  // Closing this sheet's <Modal> and presenting another native modal (camera/library/document
  // picker) right after is a known iOS race: the JS animation finishing (and even the state
  // flip that unmounts the RN <Modal>) doesn't guarantee the underlying UIKit view controller
  // has actually finished tearing down yet — presenting too soon can make the picker silently
  // fail to appear. The sidebar's "chat from image" flow (ChatFileSelectScreen) doesn't hit
  // this because it opens the picker from a plain screen, not from inside an already-open
  // Modal. A fixed buffer after the animation callback is the standard workaround.
  const waitForAttachSheetToFullyClose = () =>
    new Promise<void>((resolve) => closeAttachMenu(() => setTimeout(resolve, 200)));

  // Semantic Scholar and PubMed are real, independently-toggleable APIs added alongside Europe
  // PMC (which always runs regardless — see chatService.chatMedicalLive). Both default on.
  // Independent of the advanced MedicalFilterModal, which is a separate, more granular Europe
  // PMC-only filter surface (source categories/article types) and defaults books/guidelines off.
  const semanticScholarEnabled = medicalFilters.sources?.semanticScholar !== false;
  const pubmedEnabled = medicalFilters.sources?.pubmed !== false;
  const toggleLiteratureSource = (key: 'semanticScholar' | 'pubmed') => {
    setMedicalFilters((prev) => ({
      ...prev,
      sources: {
        ...prev.sources,
        [key]: !(prev.sources?.[key] !== false),
      },
    }));
  };
  // Ask Anything is the first thing shown now that typing directly works with no session —
  // the sidebar no longer needs to auto-open, it's just reachable via the hamburger button.
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [attachedSources, setAttachedSources] = useState<{ type: 'note' | 'file'; title: string }[]>([]);

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

  // Generic self-dismissing toast (copy confirmation, pin-limit notice, etc.) — one instance
  // reused for all of them since only one is ever relevant at a time.
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [message, setMessage] = useState('');
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
  const embeddingPollCancelRef = useRef<{ cancelled: boolean } | null>(null);
  const sseChatCleanupRef = useRef<(() => void) | null>(null);
  // Synchronous re-entrancy guard for handleSendMessage — the Send button's `disabled` prop
  // only takes effect on the *next* render, so several taps in the same frame (e.g. a user
  // tapping repeatedly because nothing visibly happened yet) would otherwise all start their
  // own session-creation/send flow concurrently. A plain boolean ref (not state) is checked
  // synchronously at the very top of handleSendMessage, before any await, so only the first
  // tap gets through.
  const isSendingRef = useRef(false);
  // Memoized so typing in the composer (which re-renders this whole screen on every keystroke)
  // doesn't hand the FlatList a brand-new array reference each time — a new `data` reference
  // makes FlatList treat it as "the list changed" and re-evaluate everything, which for a chat
  // full of rich content (markdown, citation images) reads as the screen visibly reloading.
  const invertedMessages = useMemo(() => [...messages], [messages]);

  // Depends on chatId, not just []: when this screen is already the top of the stack and the
  // sidebar/attach-menu navigates to a *different* chatId, React Navigation merges the new
  // params into this same screen instance instead of remounting it — so without chatId in the
  // dependency array, this would only ever run once and silently keep showing the previous
  // chat's messages forever. Resetting state here first avoids a flash of the old chat's
  // content while the new one loads.
  useEffect(() => {
    setMessages([]);
    setSessionId(chatId || null);
    setChatTitle(fileName || title || 'Chat');
    setEmbeddingStatus('pending');
    setEmbeddingProgress(0);
    setAttachedSources([]);
    setIsMedical(type === 'medical_qa');
    setIsPinned(false);
    initializeChat();
    return () => {
      if (embeddingPollCancelRef.current) embeddingPollCancelRef.current.cancelled = true;
      sseChatCleanupRef.current?.();
    };
  }, [chatId]);

  // Re-fetch the session on refocus (but not on the very first mount, which the effect above
  // already handles) — picks up embeddingStatus/attachedSources changes after returning from
  // the "+" attach picker (ChatFileSelectScreen), same way pollEmbeddingStatus already does
  // for the session's original source.
  const hasFocusedOnceRef = useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      if (chatId) {
        api.getChatSession(chatId).then((response) => {
          if (response.success && response.data) {
            setEmbeddingStatus(response.data.embeddingStatus);
            setEmbeddingProgress(response.data.embeddingProgress);
            setAttachedSources(response.data.attachedSources || []);
            if (response.data.embeddingStatus === 'processing') {
              pollEmbeddingStatus(response.data._id);
            }
          }
        }).catch((error) => console.error('Failed to refresh session on focus:', error));
      }
    }, [chatId])
  );

  const initializeChat = async () => {
    try {
      setIsLoadingSession(true);

      if (chatId) {
        const response = await api.getChatSession(chatId);

        if (response.success && response.data) {
          setSessionId(response.data._id);
          setEmbeddingStatus(response.data.embeddingStatus);
          setEmbeddingProgress(response.data.embeddingProgress);
          setAttachedSources(response.data.attachedSources || []);
          setIsPinned(!!response.data.pinnedAt);
          if (response.data.title) setChatTitle(response.data.title);

          const loadedMessages: Message[] = await Promise.all(
            response.data.messages.map(async (msg: any) => ({
              id: msg._id || `${msg.role}-${msg.timestamp}`,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              attachedImageUri: msg.attachmentFileId ? await api.getFileContentUrl(msg.attachmentFileId) : undefined,
            }))
          );
          setMessages(loadedMessages);

          // Belt-and-suspenders alongside the FlatList's onContentSizeChange/onLayout handlers:
          // scrollToEnd right after mount can land on a stale offset before variable-height
          // message bubbles finish laying out, so retry once more a beat later.
          requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
          });

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

  // Resolves once embedding reaches a terminal state (completed/failed) or polling gives up —
  // never hangs forever, so callers can safely `await` it (e.g. handleSendMessage, to hold a
  // send until a just-created document session is ready) as well as fire-and-forget it (the
  // various "start a session and let the header's Processing badge update in the background"
  // call sites, which don't care when/whether it resolves).
  const pollEmbeddingStatus = (sid: string): Promise<void> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const MAX_ATTEMPTS = 60; // 60 × 2s = 120s max
      const token = { cancelled: false };
      embeddingPollCancelRef.current = token;

      const poll = async () => {
        if (token.cancelled || attempts >= MAX_ATTEMPTS) {
          resolve();
          return;
        }
        attempts++;
        try {
          const response = await api.getChatSession(sid);
          if (token.cancelled) {
            resolve();
            return;
          }
          if (response.success && response.data) {
            setEmbeddingStatus(response.data.embeddingStatus);
            setEmbeddingProgress(response.data.embeddingProgress);
            if (
              response.data.embeddingStatus === 'completed' ||
              response.data.embeddingStatus === 'failed'
            ) {
              resolve();
              return;
            }
          } else {
            resolve();
            return;
          }
        } catch {
          resolve();
          return;
        }
        setTimeout(poll, 2000);
      };

      setTimeout(poll, 2000);
    });
  };

  const handleGoBack = () => {
    // When this screen is the "Chat" tab's root (reached with no params, no push history),
    // there's nothing to go back to — the header hides the back button in that case instead.
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleOpenRename = () => {
    setRenameValue(chatTitle);
    setIsRenameModalVisible(true);
  };

  const handleTogglePin = async () => {
    if (!sessionId || isPinning) return;
    setIsPinning(true);
    const wasPinned = isPinned;
    setIsPinned(!wasPinned); // optimistic
    try {
      const response = await api.togglePinChatSession(sessionId);
      if (!response.success) {
        setIsPinned(wasPinned); // revert
        if (!wasPinned) {
          setToastMessage("You've reached your 3-pin limit");
        } else {
          showAlert('Error', response.message || 'Failed to update pin');
        }
      }
    } catch {
      setIsPinned(wasPinned);
      showAlert('Error', 'Failed to update pin');
    } finally {
      setIsPinning(false);
    }
  };

  // Sidebar disabled — these handlers only fed ChatSidebar's callbacks.
  // const handleSelectSession = (session: ChatSessionSummary) => {
  //   setIsSidebarVisible(false);
  //   navigation.navigate('ChatConversation', {
  //     chatId: session._id,
  //     title: session.title,
  //     type: session.sourceType,
  //     noteId: session.noteId,
  //   });
  // };

  // const handleStartNewFromSidebar = (fileType: 'note' | 'image' | 'document') => {
  //   setIsSidebarVisible(false);
  //   navigation.navigate('ChatFileSelect', { type: fileType });
  // };

  // const handleStartMedicalFromSidebar = async () => {
  //   setIsSidebarVisible(false);
  //   try {
  //     const response = await api.createMedicalChatSession();
  //     if (response.success && response.data) {
  //       navigation.navigate('ChatConversation', {
  //         chatId: response.data._id,
  //         title: response.data.title,
  //         type: 'medical_qa',
  //       });
  //     } else if (response.quotaExceeded) {
  //       await showInAppPaywall();
  //     } else {
  //       showAlert('Error', response.message || 'Failed to start a new question. Please try again.');
  //     }
  //   } catch (error: any) {
  //     showAlert('Error', error.message || 'Failed to start a new question. Please try again.');
  //   }
  // };

  /** Picks + uploads an image in the background and shows it as a removable thumbnail above
   *  the composer — the actual attach-to-session/create-session call happens on Send (see
   *  handleSendMessage), so the caption typed alongside it goes out as the same action. */
  const pickAndStageImage = async (source: 'camera' | 'library') => {
    await waitForAttachSheetToFullyClose();
    const { status } = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(
        'Permission Required',
        source === 'camera'
          ? 'Please grant camera permission to take a photo.'
          : 'Please grant photo library permission to upload images.'
      );
      return;
    }

    // quality 0.7 rather than the default 1 — full-res camera photos (5-15MB) were large enough
    // over the multipart upload that the request would sometimes drop mid-transfer on real
    // devices ("Network request failed"), not just time out.
    const pickerOptions = { mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: false, quality: 0.7 } as const;
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (result.canceled) return;

    const image = result.assets[0];
    const fileName = image.uri.split('/').pop() || 'image.jpg';
    setPendingAttachment({ uri: image.uri, fileName, kind: 'image', isUploading: true });

    try {
      const uploadResponse = await api.uploadImageWithOCR({
        uri: image.uri,
        type: image.mimeType || 'image/jpeg',
        name: fileName,
      });
      if (uploadResponse.success && uploadResponse.data) {
        setPendingAttachment({ uri: image.uri, fileName, kind: 'image', fileId: uploadResponse.data.fileId, isUploading: false });
      } else {
        throw new Error(uploadResponse.message || 'Failed to upload image');
      }
    } catch (error: any) {
      setPendingAttachment(null);
      showAlert('Upload failed', error.message || 'Failed to upload image');
    }
  };

  const handleCameraCapture = () => pickAndStageImage('camera');
  const handlePhotoLibraryOption = () => pickAndStageImage('library');

  /** "Files" attach card — same staged-thumbnail pattern as images. PDF and plain text
   *  supported today; Word/PowerPoint/etc. aren't wired to a text extractor yet. */
  const handleUploadFileOption = async () => {
    await waitForAttachSheetToFullyClose();
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    setPendingAttachment({ uri: file.uri, fileName: file.name, kind: 'document', isUploading: true });

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'application/pdf',
        name: file.name,
      } as any);
      const uploadResponse = await api.uploadPDFWithExtraction(formData);
      if (uploadResponse.success && uploadResponse.data) {
        setPendingAttachment({ uri: file.uri, fileName: file.name, kind: 'document', fileId: uploadResponse.data.fileId, isUploading: false });
      } else {
        throw new Error(uploadResponse.message || 'Failed to upload document');
      }
    } catch (error: any) {
      setPendingAttachment(null);
      showAlert('Upload failed', error.message || 'Failed to upload document');
    }
  };

  const handleRemovePendingAttachment = () => setPendingAttachment(null);

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

  // isMedical is passed in explicitly rather than read from state: this function can run
  // moments after setIsMedical(true) on the very first message (auto-created session from
  // the welcome screen), before React has re-rendered — reading the state directly here
  // would still see the stale `false` from the render that started this call, silently
  // reading data.result.response (undefined for medical_live jobs) instead of data.result.text.
  const listenChatJob = (jobId: string, isMedicalForJob: boolean): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const cleanup = api.listenToJobStream(
        jobId,
        (data) => {
          sseChatCleanupRef.current = null;
          if (data.status === 'failed') {
            reject(new Error(data.error || 'Failed to get AI response.'));
          } else {
            // Medical live mode returns { text, sources, images }; standard RAG chat
            // returns { response, sources }. Different shape from the same job endpoint.
            const aiResponse: Message = isMedicalForJob
              ? {
                  id: `ai-${Date.now()}`,
                  role: 'assistant',
                  content: data.result.text,
                  timestamp: new Date(),
                  sources: data.result.sources,
                  images: data.result.images,
                  groundingSources: data.result.groundingSources,
                }
              : {
                  id: `ai-${Date.now()}`,
                  role: 'assistant',
                  content: data.result.response,
                  timestamp: new Date(),
                };
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setMessages((prev) => [...prev, aiResponse]);

            // Present only on the very first exchange — the backend auto-titles the session
            // from what was actually asked, same as ChatGPT/Claude, instead of leaving the
            // generic default. Refresh the sidebar so the new title shows there too.
            if (data.result.title) {
              setChatTitle(data.result.title);
              setSidebarRefreshKey((k) => k + 1);
            }

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
    if (!message.trim()) return;
    if (pendingAttachment?.isUploading) return; // Send button is disabled for this too — belt and suspenders.
    if (isSendingRef.current) return; // A repeated tap while the first send is still in flight — ignore it.
    isSendingRef.current = true;

    // React state updates are async, so if this call auto-creates a session below, `sessionId`
    // and `isMedical` state won't reflect it until the next render — these locals are what the
    // rest of THIS function call actually uses, so the very first message routes correctly.
    let activeSessionId = sessionId;
    let activeIsMedical = isMedical;

    // Captured up front, before the optimistic bubble below clears pendingAttachment — so the
    // bubble shows the thumbnail the caption was written alongside, and the create/attach calls
    // further down still have the fileId to work with.
    const stagedAttachment = pendingAttachment;
    const attachmentUriForBubble = stagedAttachment?.kind === 'image' ? stagedAttachment.uri : undefined;
    const attachmentFileIdForMessage = stagedAttachment?.kind === 'image' ? stagedAttachment.fileId : undefined;

    // Optimistic UI: the message (with its attachment thumbnail) and the typing indicator show
    // immediately, exactly like a normal chat send — session creation/embedding all happen in
    // the background below instead of blocking the bubble from appearing or popping a "please
    // wait" alert that made it look like the tap hadn't registered.
    const msgContent = message.trim();
    const tempId = `temp-${Date.now()}`;
    const userMessage: Message = {
      id: tempId,
      role: 'user',
      content: msgContent,
      timestamp: new Date(),
      attachedImageUri: attachmentUriForBubble,
    };
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setPendingAttachment(null);
    setIsSendingMessage(true);

    try {
      if (!activeSessionId && stagedAttachment?.fileId) {
        // Starting a brand new chat from an image/document staged via the "+" sheet.
        const createResponse = await api.createChatSessionFromDocument(stagedAttachment.fileId);
        if (!createResponse.success || !createResponse.data) {
          if (createResponse.quotaExceeded) {
            await showInAppPaywall();
          } else {
            showAlert('Error', createResponse.message || 'Failed to start chat from this file.');
          }
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          return;
        }
        activeSessionId = createResponse.data._id as string;
        activeIsMedical = false;
        setSessionId(activeSessionId);
        setIsMedical(false);
        setChatTitle(createResponse.data.title || (stagedAttachment.kind === 'image' ? 'Chat from image' : stagedAttachment.fileName));
        setEmbeddingStatus(createResponse.data.embeddingStatus);
        setEmbeddingProgress(createResponse.data.embeddingProgress);
        // This screen was already showing the blank/welcome state (no route param for `type`
        // yet, since no navigation happened to get here) — sync it now so the empty-state icon
        // and "Try asking" suggestions match what was actually attached, instead of falling
        // through to the generic medical_qa ones.
        navigation.setParams({ type: createResponse.data.sourceType, fileName: stagedAttachment.fileName });

        if (createResponse.data.embeddingStatus === 'processing') {
          // Wait right here instead of bailing out and asking the user to hit Send again — the
          // typing indicator already shown communicates "still working", and since this is all
          // one continuous async call there's no stale-closure risk once it's ready.
          await pollEmbeddingStatus(activeSessionId);
        }
      } else if (!activeSessionId) {
        // Typing directly into the welcome screen, no chat started yet — start a medical Q&A
        // session on the fly rather than making the user open the sidebar first.
        const createResponse = await api.createMedicalChatSession();
        if (!createResponse.success || !createResponse.data) {
          if (createResponse.quotaExceeded) {
            await showInAppPaywall();
          } else {
            showAlert('Error', createResponse.message || 'Failed to start a new question. Please try again.');
          }
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          return;
        }
        activeSessionId = createResponse.data._id;
        activeIsMedical = true;
        setSessionId(activeSessionId);
        setIsMedical(true);
        setChatTitle(createResponse.data.title);
        setEmbeddingStatus('completed');
        setEmbeddingProgress(100);
      } else if (stagedAttachment?.fileId) {
        // Already in a chat — attach the staged file before sending the caption.
        const attachResponse = await api.attachSourceToSession(activeSessionId, { fileId: stagedAttachment.fileId });
        if (!attachResponse.success) {
          showAlert('Error', attachResponse.message || 'Failed to attach file');
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          return;
        }
        // Medical sessions bypass the local embedding store for the actual answer (see
        // chatService.chatMedicalLive) — only non-medical (document/RAG) chats need to wait.
        if (!activeIsMedical) {
          setEmbeddingStatus('processing');
          await pollEmbeddingStatus(activeSessionId);
        }
      } else if (!activeIsMedical && embeddingStatus === 'processing') {
        // Plain follow-up message in an existing document chat whose embedding (from however
        // it was originally created) hadn't finished yet.
        await pollEmbeddingStatus(activeSessionId);
      }

      if (!activeSessionId) return;

      // Live search blends in for medical_qa sessions unconditionally, and for any other chat
      // type when the drawer's "Live medical search" switch is on — chatMedicalLive already
      // pulls in this session's own embedded content via sessionId, so a document/image chat
      // gets both its own content AND live FDA/PubMed/Wikipedia search in the same answer.
      const useLiveSearch = activeIsMedical || liveSearchEnabled;
      const response = useLiveSearch
        ? await api.sendChatMessage(activeSessionId, msgContent, false, 'medical_live', medicalFilters, getShownImageUrls(), attachmentFileIdForMessage)
        : await api.sendChatMessage(activeSessionId, msgContent, false, undefined, undefined, undefined, attachmentFileIdForMessage);

      if (!response.success || !response.data?.jobId) {
        throw new Error(response.message || 'Failed to start message processing');
      }

      // Track in-flight chat message job for background processing
      await appLifecycleService.trackInFlightJob(response.data.jobId, 'chat');

      await listenChatJob(response.data.jobId, activeIsMedical);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      showAlert('Error', error.message || 'Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSendingMessage(false);
      isSendingRef.current = false;
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question);
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
    setToastMessage('Copied to clipboard');
  };

  const [generatingActionId, setGeneratingActionId] = useState<string | null>(null);
  const [isCreateQuizModalVisible, setCreateQuizModalVisible] = useState(false);
  const [isCreateFlashcardsModalVisible, setCreateFlashcardsModalVisible] = useState(false);

  /** Plain-text transcript of the whole conversation so far — used as the source for
   *  whole-chat quiz/flashcard generation (not just a single answer). */
  const buildChatTranscript = () =>
    messages
      .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${stripHtml(m.content)}`)
      .join('\n\n');

  /** Image URLs already shown earlier in this session — sent with the next request so the
   *  backend can exclude them and avoid repeating the same image across different answers. */
  const getShownImageUrls = (fromMessages: Message[] = messages): string[] =>
    fromMessages.flatMap((m) => m.images?.map((img) => img.url) ?? []);

  const handleGenerateQuizFromChat = () => {
    if (generatingActionId || messages.length === 0) return;
    // The attach sheet's own Modal is still animating closed (~200ms) at this point —
    // opening a second native Modal while it's still mounted causes the incoming touch
    // to also land on the new modal's backdrop and immediately dismiss it. Wait for the
    // attach sheet to fully unmount first (same collision the paywall flow works around).
    setTimeout(() => setCreateQuizModalVisible(true), 300);
  };

  const handleConfirmGenerateQuiz = (questionCount: number, timeInMinutes: number) => {
    navigation.navigate('Quiz', {
      chatTranscript: buildChatTranscript(),
      noteTitle: chatTitle,
      questionCount,
      timeInMinutes,
      chatSessionId: sessionId ?? undefined,
    });
  };

  const handleGenerateFlashcardsFromChat = () => {
    if (generatingActionId || messages.length === 0) return;
    if (buildChatTranscript().length < 100) {
      showAlert('Not enough content yet', 'Chat a bit more before generating flashcards (minimum 100 characters).');
      return;
    }
    // Same attach-sheet-close collision the quiz flow works around — wait for it to
    // fully unmount before opening the next native Modal.
    setTimeout(() => setCreateFlashcardsModalVisible(true), 300);
  };

  const handleConfirmGenerateFlashcards = async (cardCount: number) => {
    setGeneratingActionId('flashcards-chat');
    try {
      const transcript = buildChatTranscript();
      const response = await api.generateFlashcardsFromText(
        transcript,
        chatTitle,
        cardCount,
        undefined,
        undefined,
        undefined,
        sessionId ?? undefined
      );
      if (response.success && response.data) {
        setCreateFlashcardsModalVisible(false);
        navigation.navigate('FlashcardReview', {
          setId: response.data._id,
          title: response.data.title,
        });
      } else if (response.quotaExceeded) {
        setCreateFlashcardsModalVisible(false);
        await showInAppPaywall();
      } else {
        showAlert('Error', response.message || 'Failed to generate flashcards');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to generate flashcards');
    } finally {
      setGeneratingActionId(null);
    }
  };

  const handleRegenerateResponse = async (messageIndex: number) => {
    if (!sessionId) return;

    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || userMessageIndex >= messages.length) return;

    const userMessage = messages[userMessageIndex];
    const priorMessages = messages.slice(0, messageIndex);
    setMessages(priorMessages);
    setIsSendingMessage(true);

    try {
      const response = (isMedical || liveSearchEnabled)
        ? await api.sendChatMessage(sessionId, userMessage.content, false, 'medical_live', medicalFilters, getShownImageUrls(priorMessages))
        : await api.sendChatMessage(sessionId, userMessage.content);

      if (!response.success || !response.data?.jobId) {
        throw new Error(response.message || 'Failed to regenerate response');
      }

      // Track in-flight chat message job for background processing
      await appLifecycleService.trackInFlightJob(response.data.jobId, 'chat');

      await listenChatJob(response.data.jobId, isMedical);
    } catch (error: any) {
      showAlert('Error', 'Failed to regenerate response');
      setMessages(messages);
    } finally {
      setIsSendingMessage(false);
    }
  };

  /** Groups sources by journal for the pill row ("Journal +N") — the design shows
   *  pills grouped by source provider (NHS/PubMed/etc.), but that isn't a field
   *  the API returns; journal is the closest available grouping key. */
  const groupSourcesForPills = (sources: MedicalChatSource[]) => {
    const byJournal = new Map<string, MedicalChatSource[]>();
    sources.forEach((s) => {
      const key = s.journal || 'Source';
      if (!byJournal.has(key)) byJournal.set(key, []);
      byJournal.get(key)!.push(s);
    });
    return Array.from(byJournal.entries()).map(([journal, group]) => ({
      label: group.length > 1 ? `${journal} +${group.length - 1}` : journal,
      sources: group,
    }));
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        {isUser ? (
          <View style={styles.userMessageColumn}>
            {!!item.attachedImageUri && (
              <TouchableOpacity
                onPress={() => setPreviewImage({
                  url: item.attachedImageUri!,
                  title: '',
                  contextUrl: '',
                  attributionRequired: false,
                })}
                activeOpacity={0.8}
              >
                <Image source={{ uri: item.attachedImageUri }} style={styles.sentAttachmentThumb} />
              </TouchableOpacity>
            )}
            <View style={styles.userMessage}>
              <Text style={styles.userMessageText}>{item.content}</Text>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.assistantMessage}>
              {/* Static disclosure row — not wired to a real "reasoning" payload;
                  tapping it opens the citations sheet when sources exist. */}
              <TouchableOpacity
                style={styles.thinkingRow}
                onPress={() => item.sources?.length && setCitationsSheetSources(item.sources)}
                activeOpacity={item.sources?.length ? 0.7 : 1}
              >
                <Icon name="ai" size={20} color={theme.colors.grey[400]} />
                <Text style={styles.thinkingText}>Thinking and finding resources for you...</Text>
                <Icon name="foward" size={16} color={theme.colors.grey[400]} style={{ transform: [{ rotate: '90deg' }] }} />
              </TouchableOpacity>

              <RichText content={item.content} />
            </View>

            {!!item.images?.length && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagesRow}
                contentContainerStyle={styles.imagesRowContent}
              >
                {item.images.map((image, i) => (
                  <TouchableOpacity
                    key={`${item.id}-image-${i}`}
                    onPress={() => setPreviewImage(image)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: image.url }} style={styles.citationImage} resizeMode="cover" />
                    {!!image.attribution && (
                      <Text style={styles.imageAttribution} numberOfLines={1}>{image.attribution}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {!!item.sources?.length && (
              <View style={styles.citationPillsRow}>
                {groupSourcesForPills(item.sources).map((group) => (
                  <TouchableOpacity
                    key={group.label}
                    style={styles.citationPill}
                    onPress={() => setCitationsSheetSources(item.sources!)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.citationPillText}>{group.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!!item.groundingSources?.length && (
              <View style={styles.groundingContainer}>
                <Text style={styles.groundingHeader}>Also referenced from the web</Text>
                {item.groundingSources.map((source, i) => (
                  <TouchableOpacity
                    key={`${item.id}-grounding-${i}`}
                    style={styles.groundingCard}
                    onPress={() => Linking.openURL(source.uri)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.groundingTitle} numberOfLines={2}>{source.title}</Text>
                    <Text style={styles.sourceLinkArrow}>↗</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.messageActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleRegenerateResponse(index)}
                activeOpacity={0.7}
                disabled={isSendingMessage}
              >
                <RegenerateIcon size={20} color={theme.colors.grey[700]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleCopyMessage(item.content)}
                activeOpacity={0.7}
              >
                <Icon name="copy" size={20} color={theme.colors.grey[700]} />
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

    if (!sessionId) {
      return (
        <View style={styles.emptyChat}>
          <ChatWelcomeHero onSelectTopic={handleSuggestedQuestion} />
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

    if (isMedical) {
      return (
        <View style={styles.emptyChat}>
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>
              💡 Ask any clinical question — no upload needed. I'll answer using cited medical literature, with relevant images where available.
            </Text>
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
      case 'medical_qa':
      default:
        // Also covers the welcome screen (type is undefined until a session exists) — typing
        // directly there starts a medical_qa session, so these examples apply there too.
        return [
          'What are the causes, symptoms, and treatments of pneumonia?',
          'What are common ACE inhibitor drug interactions?',
          'What is the standard dosing range for metformin?',
        ];
    }
  };

  const suggestedQuestions = getSuggestedQuestions();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — full redesign: avatar (opens chat list) + Upgrade on the left,
          bookmark + options ("•••") on the right. Chat title moves to its own row below,
          still tappable to rename. No back chevron: this screen is the "Home" tab's root,
          which has no back semantics (same as Library/Profile); when reached via a
          push from elsewhere, the OS back gesture/button still works regardless. */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity onPress={() => navigation.navigate('ChatList')} activeOpacity={0.7}>
              <Icon name="logo" size={40} />
            </TouchableOpacity>
            <Text style={styles.headerWordmark}>Clinicalfact</Text>
            <TouchableOpacity
              style={[styles.headerStatusBadge2, hasAccess ? styles.headerProBadge : styles.headerFreeBadge]}
              onPress={() => { if (!hasAccess) showInAppPaywall(); }}
              activeOpacity={hasAccess ? 1 : 0.85}
              disabled={hasAccess}
            >
              <Text style={[styles.headerStatusBadgeText, hasAccess ? styles.headerProBadgeText : styles.headerFreeBadgeText]}>
                {hasAccess ? 'Pro' : 'Free'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              style={[styles.headerIconButton, isPinned && styles.headerIconButtonActive]}
              onPress={handleTogglePin}
              activeOpacity={0.7}
              disabled={!sessionId || isPinning}
            >
              <Icon name="bookmarks" size={24} color={isPinned ? theme.colors.white : theme.colors.grey[900]} />
            </TouchableOpacity>
            {/* Commented out (not deleted) — the "•••" menu (rename chat + advanced filters)
                this used to open. Rename is still reachable by tapping the chat title itself
                (see headerTitleRow below); advanced filters now opens directly from the icon
                underneath instead of via this menu. Kept in case the menu is needed again.
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setIsOptionsMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Icon name="options" size={24} color={theme.colors.grey[900]} />
            </TouchableOpacity>
            */}
            {(isMedical || liveSearchEnabled) && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => setIsFilterModalVisible(true)}
                activeOpacity={0.7}
              >
                <FilterIcon size={24} color={theme.colors.grey[900]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {sessionId && (
          <TouchableOpacity
            style={styles.headerTitleRow}
            onPress={handleOpenRename}
            activeOpacity={0.7}
          >
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
        )}
      </View>

      {attachedSources.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.attachedChipsRow}
          contentContainerStyle={styles.attachedChipsContent}
        >
          {attachedSources.map((source, i) => (
            <View key={`${source.title}-${i}`} style={styles.attachedChip}>
              <Text style={styles.attachedChipText} numberOfLines={1}>
                {source.type === 'note' ? '📄' : '📎'} {source.title}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

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
          // Not inverted, so the list otherwise mounts scrolled to the top (oldest message) —
          // both on reopening a chat with history already loaded and as new messages stream in.
          // Re-running scrollToEnd whenever content height changes covers both cases.
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          // Called immediately (an element), not passed as a bare function reference — FlatList
          // treats ListEmptyComponent-as-function as a component *type*, and renderEmptyChat is
          // redefined every render (every keystroke, since the composer is a controlled input),
          // so passing the function itself made React remount the whole empty state each time —
          // including ChatWelcomeHero's mount-triggered entrance animation, which is what was
          // visibly "reloading".
          ListEmptyComponent={renderEmptyChat()}
          ListFooterComponent={isSendingMessage ? <TypingIndicator /> : null}
        />

        {/* Suggested questions — shown once a session/attachment exists with no messages yet
            (the bare welcome state has its own topic cards in ChatWelcomeHero instead), and
            again after every AI reply as follow-up prompts; hidden while the next reply is
            still streaming in and as soon as the user sends a new message. */}
        {sessionId && embeddingStatus === 'completed' && !isSendingMessage &&
          (messages.length === 0 || messages[messages.length - 1]?.role === 'assistant') && (
          <View style={styles.suggestedSection}>
            <Text style={styles.suggestedTitle}>Follow up questions</Text>
            <View style={styles.suggestedContainer}>
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestedRow,
                    index < suggestedQuestions.length - 1 && styles.suggestedRowDivider,
                  ]}
                  onPress={() => handleSuggestedQuestion(question)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestedText}>{question}</Text>
                  <Icon name="foward" size={16} color={theme.colors.grey[200]} />
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
          {/* Main input card — text field on top, attach (+) and send on a row below.
              The "+" is always available: with no chat open yet, it starts a new one; inside
              an open chat, it attaches to that chat instead. */}
          <View style={[styles.inputRow, isInputFocused && styles.inputRowFocused]}>
            {pendingAttachment && (
              <View style={styles.pendingAttachmentThumb}>
                {pendingAttachment.kind === 'image' ? (
                  <Image source={{ uri: pendingAttachment.uri }} style={styles.pendingAttachmentImage} />
                ) : (
                  <View style={styles.pendingAttachmentFileIcon}>
                    <Icon name="files" size={28} color={theme.colors.yale[900]} />
                  </View>
                )}
                {pendingAttachment.isUploading && (
                  <View style={styles.pendingAttachmentUploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.pendingAttachmentClose}
                  onPress={handleRemovePendingAttachment}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={14} color={theme.colors.grey[900]} />
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              style={styles.textInput}
              placeholder={
                !sessionId
                  ? 'Ask a medical question to get more clarifications'
                  : embeddingStatus === 'completed'
                  ? 'Ask anything about this document...'
                  : type === 'image' ? 'Extracting text...' :
                    type === 'document' ? 'Processing PDF...' :
                    'Processing...'
              }
              placeholderTextColor={theme.colors.grey[300]}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              editable={(!sessionId || embeddingStatus === 'completed') && !isSendingMessage}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
            />
            <View style={styles.inputActionsRow}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => setIsAttachMenuVisible(true)}
                activeOpacity={0.7}
              >
                <Icon name="add" size={20} color={theme.colors.grey[900]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!message.trim() || (!!sessionId && embeddingStatus !== 'completed') || isSendingMessage || pendingAttachment?.isUploading) && styles.sendButtonDisabled,
                ]}
                onPress={() => withAccess(handleSendMessage)}
                disabled={!message.trim() || (!!sessionId && embeddingStatus !== 'completed') || isSendingMessage || pendingAttachment?.isUploading}
              >
                {isSendingMessage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <SendMessageIcon size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          {message.length > 800 && (
            <Text style={styles.characterCount}>{message.length}/1000</Text>
          )}
        </View>
  }
      </KeyboardAvoidingView>

      <Toast
        visible={!!toastMessage}
        message={toastMessage ?? ''}
        onHide={() => setToastMessage(null)}
      />

<CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText}
        onClose={closeAlert}
        onButtonPress={alertConfig.onButtonPress}
      />

      {(isMedical || liveSearchEnabled) && (
        <MedicalFilterModal
          visible={isFilterModalVisible}
          onClose={() => setIsFilterModalVisible(false)}
          filters={medicalFilters}
          onApply={setMedicalFilters}
        />
      )}

      <CreateQuizModal
        visible={isCreateQuizModalVisible}
        onClose={() => setCreateQuizModalVisible(false)}
        onGenerateQuiz={handleConfirmGenerateQuiz}
        noteTitle={chatTitle}
      />

      <CreateFlashcardsModal
        visible={isCreateFlashcardsModalVisible}
        onClose={() => setCreateFlashcardsModalVisible(false)}
        onGenerateFlashcards={handleConfirmGenerateFlashcards}
        isGenerating={generatingActionId === 'flashcards-chat'}
        noteTitle={chatTitle}
      />

      {/* "Add to chat" sheet — the redesigned "+" menu. Card grid for attaching a new
          source, optional source-search toggles (medical chats only), and whole-chat
          quiz/flashcard generation once there's actually a conversation to draw from. */}
      <Modal
        visible={isAttachMenuVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeAttachMenu()}
      >
        <Animated.View style={[styles.attachSheetOverlay, { opacity: attachMenuOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => closeAttachMenu()} />
          <Animated.View
            style={[
              styles.attachSheet,
              { transform: [{ translateY: attachMenuTranslateY }], paddingBottom: insets.bottom + spacing[4] },
            ]}
          >
            <View style={styles.attachSheetHandle} />
            <View style={styles.attachSheetHeader}>
              <TouchableOpacity onPress={() => closeAttachMenu()} style={styles.attachSheetCloseButton} activeOpacity={0.7}>
                <Icon name="close" size={20} color={theme.colors.grey[900]} />
              </TouchableOpacity>
              <Text style={styles.attachSheetTitle}>Add to chat</Text>
              <View style={styles.attachSheetCloseButton} />
            </View>

            <View style={styles.attachCardGrid}>
              <TouchableOpacity style={styles.attachCard} onPress={handleCameraCapture} activeOpacity={0.7}>
                <View style={styles.attachCardIcon}>
                  <Icon name="camera" size={24} color={theme.colors.yale[900]} />
                </View>
                <Text style={styles.attachCardText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachCard} onPress={handlePhotoLibraryOption} activeOpacity={0.7}>
                <View style={styles.attachCardIcon}>
                  <Icon name="imageFill" size={24} color={theme.colors.yale[900]} />
                </View>
                <Text style={styles.attachCardText}>Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachCard} onPress={handleUploadFileOption} activeOpacity={0.7}>
                <View style={styles.attachCardIcon}>
                  <Icon name="files" size={24} color={theme.colors.yale[900]} />
                </View>
                <Text style={styles.attachCardText}>Files</Text>
              </TouchableOpacity>
            </View>

            {messages.length > 0 && (
              <View style={styles.attachActionList}>
                <TouchableOpacity
                  style={styles.attachActionRow}
                  onPress={() => { closeAttachMenu(); handleGenerateQuizFromChat(); }}
                  activeOpacity={0.7}
                  disabled={!!generatingActionId}
                >
                  <Icon name="quizFill" size={24} color={theme.colors.yale[700]} />
                  <Text style={styles.attachActionText}>Generate Quiz</Text>
                  <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.attachActionRow}
                  onPress={() => { closeAttachMenu(); handleGenerateFlashcardsFromChat(); }}
                  activeOpacity={0.7}
                  disabled={!!generatingActionId}
                >
                  <Icon name="flashcardsFill" size={24} color={theme.colors.yale[700]} />
                  <Text style={styles.attachActionText}>Generate Flashcards</Text>
                  <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.sourceToggleSection}>
              <Text style={styles.attachSheetSectionLabel}>Medical source database</Text>
              <View style={styles.sourceToggleGroup}>
                <View style={styles.sourceToggleRow}>
                  <View style={styles.sourceToggleLeft}>
                    <Icon name="knowledge" size={20} color={theme.colors.yale[700]} />
                    <Text style={styles.sourceToggleLabel}>Live medical search</Text>
                  </View>
                  <DSSwitch value={liveSearchEnabled} onValueChange={toggleLiveSearch} />
                </View>
                {/* Per-provider filters only matter once live search is actually on — for a
                    medical_qa session it's always on, for any other chat type it depends on
                    the switch above. Each toggle here gates a real, independent API (Semantic
                    Scholar Graph API / NCBI PubMed E-utilities), added alongside Europe PMC
                    (which always runs regardless) and merged+deduped into one citation list —
                    see chatService.chatMedicalLive. */}
                {(isMedical || liveSearchEnabled) && (
                  <>
                    <View style={styles.sourceToggleDivider} />
                    <View style={styles.sourceToggleRow}>
                      <View style={styles.sourceToggleLeft}>
                        <Icon name="knowledge" size={20} color={theme.colors.yale[700]} />
                        <Text style={styles.sourceToggleLabel}>Semantic scholar</Text>
                      </View>
                      <DSSwitch value={semanticScholarEnabled} onValueChange={() => toggleLiteratureSource('semanticScholar')} />
                    </View>
                    <View style={styles.sourceToggleDivider} />
                    <View style={styles.sourceToggleRow}>
                      <View style={styles.sourceToggleLeft}>
                        <Icon name="knowledge" size={20} color={theme.colors.yale[700]} />
                        <Text style={styles.sourceToggleLabel}>PUB med resource</Text>
                      </View>
                      <DSSwitch value={pubmedEnabled} onValueChange={() => toggleLiteratureSource('pubmed')} />
                    </View>
                    <View style={styles.sourceToggleDivider} />
                    <View style={styles.sourceToggleRow}>
                      <View style={styles.sourceToggleLeft}>
                        <Icon name="knowledge" size={20} color={theme.colors.yale[700]} />
                        <Text style={styles.sourceToggleLabel}>FDA medical database (always on)</Text>
                      </View>
                      {/* Always on, not user-togglable — the actual FDA drug label lookup
                          (openFdaService) runs unconditionally whenever live search is on, so
                          this switch reflects that truthfully rather than implying it can be
                          turned off. No `disabled` prop: that style washes the track to a
                          neutral white regardless of value, which would visually read as "off"
                          — a no-op onValueChange keeps the true "on" (yale-700) look. */}
                      <DSSwitch value={true} onValueChange={() => {}} />
                    </View>
                  </>
                )}
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* "•••" options menu — commented out (not deleted), replaced by direct header icons
          (advanced filters opens straight from its own icon now; rename is still reachable by
          tapping the chat title). Disabled via a false-guard rather than a JSX comment block,
          since this content contains characters that would prematurely close a wrapping one.
          Kept in case needed again; also needs isOptionsMenuVisible/setIsOptionsMenuVisible
          (see declaration above) restored if reinstated. */}
      {false && (
      <Modal
        visible={false}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <TouchableOpacity
          style={styles.optionsMenuOverlay}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={styles.optionsMenu}>
            <TouchableOpacity
              style={styles.attachMenuItem}
              onPress={() => { handleOpenRename(); }}
              activeOpacity={0.7}
              disabled={!sessionId}
            >
              <Text style={styles.attachMenuIconText}>✏️</Text>
              <Text style={styles.attachMenuText}>Rename chat</Text>
            </TouchableOpacity>
            {(isMedical || liveSearchEnabled) && (
              <TouchableOpacity
                style={styles.attachMenuItem}
                onPress={() => { setIsFilterModalVisible(true); }}
                activeOpacity={0.7}
              >
                <FilterIcon size={20} color={colors.text.primary} />
                <Text style={styles.attachMenuText}>Advanced filters</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      )}

      {/* "Check citations" sheet — opened by tapping a citation pill or the
          "Thinking..." disclosure row on an assistant message. */}
      <Modal
        visible={!!citationsSheetSources}
        transparent
        animationType="slide"
        onRequestClose={() => setCitationsSheetSources(null)}
      >
        <TouchableOpacity
          style={styles.attachSheetOverlay}
          activeOpacity={1}
          onPress={() => setCitationsSheetSources(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.attachSheet}>
            <View style={styles.attachSheetHandle} />
            <View style={styles.attachSheetHeader}>
              <TouchableOpacity onPress={() => setCitationsSheetSources(null)} style={styles.attachSheetCloseButton} activeOpacity={0.7}>
                <Icon name="close" size={20} color={theme.colors.grey[900]} />
              </TouchableOpacity>
              <Text style={styles.attachSheetTitle}>Check citations</Text>
              <View style={styles.attachSheetCloseButton} />
            </View>
            <ScrollView style={styles.citationsList} showsVerticalScrollIndicator={false}>
              {citationsSheetSources?.map((source) => (
                <TouchableOpacity
                  key={source.index}
                  style={styles.citationCard}
                  onPress={() => source.doi && Linking.openURL(source.doi)}
                  activeOpacity={source.doi ? 0.7 : 1}
                >
                  <View style={styles.citationCardText}>
                    <Text style={styles.citationCardMeta} numberOfLines={1}>
                      {[source.journal, source.year].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={styles.citationCardTitle} numberOfLines={2}>{source.title}</Text>
                  </View>
                  <Icon name="foward" size={16} color={theme.colors.grey[300]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sidebar disabled — logo in the header now navigates to the chat list instead.
      <ChatSidebar
        visible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
        activeSessionId={sessionId ?? undefined}
        onSelectSession={handleSelectSession}
        onStartNew={handleStartNewFromSidebar}
        onStartMedical={handleStartMedicalFromSidebar}
        refreshKey={sidebarRefreshKey}
        onSessionDeleted={(deletedId) => {
          if (deletedId === sessionId) {
            setIsSidebarVisible(false);
            navigation.replace('ChatConversation');
          }
        }}
      />
      */}

      {/* Full-screen image preview */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewCloseButton}
            onPress={() => setPreviewImage(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.imagePreviewCloseText}>✕</Text>
          </TouchableOpacity>
          {!!previewImage && (
            <TouchableOpacity
              style={styles.imagePreviewBackdrop}
              activeOpacity={1}
              onPress={() => setPreviewImage(null)}
            >
              <Image
                source={{ uri: previewImage.url }}
                style={styles.imagePreviewFull}
                resizeMode="contain"
              />
              {!!previewImage.attribution && (
                <Text style={styles.imagePreviewAttribution}>
                  {previewImage.attribution}
                  {previewImage.license ? ` · ${previewImage.license}` : ''}
                </Text>
              )}
              {!!previewImage.contextUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(previewImage.contextUrl)} activeOpacity={0.7}>
                  <Text style={styles.imagePreviewSourceLink}>View source ↗</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Modal>

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
    backgroundColor: theme.colors.linen[300],
  },
  header: {
    backgroundColor: theme.colors.linen[300],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerWordmark: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  headerStatusBadge2: {
    paddingHorizontal: theme.spacing[2], // 8
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  headerProBadge: {
    backgroundColor: theme.colors.green[100],
  },
  headerFreeBadge: {
    backgroundColor: theme.colors.grey[100],
  },
  headerStatusBadgeText: {
    ...theme.typography.textStyles.label1,
  },
  headerProBadgeText: {
    color: theme.colors.green[700],
  },
  headerFreeBadgeText: {
    color: theme.colors.grey[600],
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4], // 16
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonActive: {
    backgroundColor: theme.colors.grey[900],
  },
  headerTitleRow: {
    marginTop: spacing[2],
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
  attachedChipsRow: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  attachedChipsContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  attachedChip: {
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    maxWidth: 180,
  },
  attachedChipText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  inputActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.linen[300],
    alignItems: 'center',
    justifyContent: 'center',
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
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4], // 16
    width: '100%',
  },
  welcomeLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
    marginBottom: theme.spacing[6], // 24
  },
  welcomeWordmark: {
    ...theme.typography.textStyles.h6,
    color: theme.colors.yale[700],
  },
  welcomeTagline: {
    ...theme.typography.textStyles.h7,
    fontFamily: theme.typography.fontFamily.lora,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.yale[900],
    textAlign: 'center',
    marginBottom: theme.spacing[2], // 8
  },
  welcomeSubtitle: {
    ...theme.typography.textStyles.caption1,
    color: theme.colors.grey[600],
    textAlign: 'center',
    marginBottom: theme.spacing[6], // 24
  },
  welcomeTopicsLabel: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.yale[900],
    textAlign: 'center',
    marginBottom: theme.spacing[2], // 8
  },
  welcomeTopicsList: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3], // 12
  },
  welcomeTopicCard: {
    width: '48%',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[4], // 16
    gap: theme.spacing[4], // 16
  },
  welcomeTopicTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeTopicIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm, // 8
    backgroundColor: theme.colors.linen[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTopicEmoji: {
    fontSize: 16,
  },
  welcomeTopicText: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
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
  userMessageColumn: {
    alignItems: 'flex-end',
    gap: theme.spacing[2],
  },
  sentAttachmentThumb: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.linen[100],
  },
  userMessage: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderTopLeftRadius: theme.borderRadius.lg, // 16
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: theme.spacing[3], // 12
    paddingVertical: theme.spacing[3], // 12
    maxWidth: '80%',
  },
  userMessageText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[900],
  },
  assistantMessage: {
    maxWidth: '100%',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
    marginBottom: theme.spacing[4], // 16
  },
  thinkingText: {
    flex: 1,
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[400],
  },
  imagesRow: {
    marginTop: theme.spacing[4], // 16
  },
  imagesRowContent: {
    gap: theme.spacing[4], // 16
  },
  citationImage: {
    width: 170,
    height: 150,
    borderRadius: theme.borderRadius.lg, // 16
    backgroundColor: theme.colors.grey[50],
  },
  imageAttribution: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    maxWidth: 120,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  imagePreviewCloseButton: {
    position: 'absolute',
    top: 56,
    right: spacing[4],
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewCloseText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  imagePreviewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  imagePreviewFull: {
    width: '100%',
    height: '70%',
  },
  imagePreviewAttribution: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing[4],
    textAlign: 'center',
  },
  imagePreviewSourceLink: {
    fontSize: typography.fontSize.sm,
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing[2],
    textDecorationLine: 'underline',
  },
  citationPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2], // 8
    marginTop: theme.spacing[4], // 16
  },
  citationPill: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[2], // 8
    paddingVertical: theme.spacing[2], // 8
  },
  citationPillText: {
    fontFamily: theme.typography.fontFamily.interRegular,
    fontWeight: '400',
    fontSize: 10,
    lineHeight: 12,
    color: theme.colors.grey[900],
  },
  sourceLinkArrow: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  citationsList: {
    width: '100%',
    maxHeight: 420,
  },
  citationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.md, // 12
    padding: theme.spacing[4], // 16
    marginBottom: theme.spacing[3], // 12
  },
  citationCardText: {
    flex: 1,
    gap: theme.spacing[1.5],
  },
  citationCardMeta: {
    ...theme.typography.textStyles.caption1,
    color: theme.colors.grey[600],
  },
  citationCardTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  groundingContainer: {
    marginTop: spacing[3],
    paddingLeft: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing[2],
  },
  groundingHeader: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  groundingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  groundingTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: 18,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[4], // 16
    marginTop: theme.spacing[3], // 12
  },
  actionButton: {
    padding: theme.spacing[1], // 4
  },
  suggestedSection: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  suggestedTitle: {
    fontFamily: theme.typography.fontFamily.lora,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[4], // 16
  },
  suggestedContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg, // 16
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    overflow: 'hidden',
  },
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[3], // 12
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[3], // 12
  },
  suggestedRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey[50],
  },
  suggestedText: {
    flex: 1,
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[900],
  },
  inputContainer: {
    backgroundColor: theme.colors.linen[300],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  inputRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius['2xl'], // 24
    padding: theme.spacing[4], // 16
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    gap: theme.spacing[3], // 12
  },
  inputRowFocused: {
    borderColor: theme.colors.yale[700],
  },
  pendingAttachmentThumb: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.linen[100],
    alignSelf: 'flex-start',
    overflow: 'visible',
  },
  pendingAttachmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
  },
  pendingAttachmentFileIcon: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAttachmentUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(28, 28, 28, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAttachmentClose: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[900],
    maxHeight: 100,
    padding: 0,
  },
  characterCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    alignSelf: 'flex-end',
    marginTop: spacing[1],
  },
  sendButton: {
    backgroundColor: theme.colors.yale[700],
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.grey[200],
  },
  // Rename modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  attachSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  attachSheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius['3xl'], // 32
    borderTopRightRadius: theme.borderRadius['3xl'],
    paddingTop: theme.spacing[6], // 24
    paddingHorizontal: spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  attachSheetHandle: {
    width: 60,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[50],
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  attachSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[6], // 24
  },
  attachSheetTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  attachSheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachCardGrid: {
    flexDirection: 'row',
    gap: theme.spacing[5], // 20
  },
  attachCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing[4], // 16
    borderRadius: theme.borderRadius['2xl'], // 24
    backgroundColor: theme.colors.linen[100],
    gap: theme.spacing[1], // 4
  },
  attachCardIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachCardText: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  attachSheetSectionLabel: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[400],
    marginTop: theme.spacing[2], // 8
    marginBottom: theme.spacing[2], // 8
  },
  attachActionList: {
    width: '100%',
    gap: theme.spacing[4], // 16
    marginTop: theme.spacing[6], // 24
  },
  attachActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[4], // 16
  },
  attachActionText: {
    flex: 1,
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  sourceToggleSection: {
    width: '100%',
    gap: theme.spacing[2], // 8
  },
  sourceToggleGroup: {
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg, // 16
    overflow: 'hidden',
  },
  sourceToggleDivider: {
    height: 1,
    backgroundColor: theme.colors.grey[50],
  },
  sourceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[3], // 12
  },
  sourceToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
  },
  sourceToggleLabel: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  attachMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  attachMenuIconText: {
    fontSize: 20,
    width: 22,
    textAlign: 'center',
  },
  attachMenuDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing[1],
  },
  attachMenuText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  optionsMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'flex-end',
    paddingRight: spacing[4],
    paddingTop: 90,
  },
  optionsMenu: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    width: 220,
    paddingVertical: spacing[2],
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
