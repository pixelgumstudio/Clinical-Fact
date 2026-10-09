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
  Clipboard,
  Animated,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api, { MedicalChatFilters, MedicalChatSource, MedicalChatImage, ChatStreamMetadataPayload, ChatStreamDonePayload } from '../../services/api';
import { useAIConsentStore } from '../../store/aiConsentStore';
import {
  colors,
  spacing,
  typography,
  Icon,
  theme,
} from '@clinicalfact/design-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useGatedFeature } from '../../hooks/useGatedFeature';
import { useAlertDialog } from '../../hooks/useAlertDialog';
import { AlertDialog } from '../../components/AlertDialog';
import { TypingIndicator } from './ChatConversation/TypingIndicator';
import { ChatGeneratedContentSection } from './ChatConversation/ChatGeneratedContentSection';
import { ChatWelcomeHero } from './ChatConversation/ChatWelcomeHero';
import { ChatMessageBubble } from './ChatConversation/ChatMessageBubble';
import { ChatEmptyState } from './ChatConversation/ChatEmptyState';
import { ChatHeader } from './ChatConversation/ChatHeader';
import { ChatCitationsSheet } from './ChatConversation/ChatCitationsSheet';
import { ChatImagePreviewModal } from './ChatConversation/ChatImagePreviewModal';
import { ChatRenameModal } from './ChatConversation/ChatRenameModal';
import { ChatAttachSheet } from './ChatConversation/ChatAttachSheet';
import { ChatComposer } from './ChatConversation/ChatComposer';
import { Message, PendingAttachment } from './ChatConversation/types';
import { Toast } from '../../components/Toast';
import { MedicalFilterModal } from '../../components/MedicalFilterModal';
import { CreateQuizModal } from '../../components/CreateQuizModal';
import { CreateFlashcardsModal } from '../../components/CreateFlashcardsModal';
import { LanguageSupportModal } from '../../components/LanguageSupportModal';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useAuthStore } from '../../store/authStore';
import { useMedicalSearchStore } from '../../store/medicalSearchStore';
import { showInAppPaywall } from '../../services/revenuecat';
import { changeLanguage } from '../../i18n';
import { getLanguageInfo } from '../../utils/language';

type ChatConversationRouteProp = RouteProp<MainStackParamList, 'ChatConversation'>;
type ChatConversationNavigationProp = NativeStackNavigationProp<MainStackParamList, 'ChatConversation'>;

// LayoutAnimation is opt-in on Android (iOS has it on by default) — enables the smooth
// insert animation used below whenever a new message is added to the list.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Real launch limit for free-tier medical Q&A queries (apps/api/src/config/quota.config.ts).
const MEDICAL_CHAT_FREE_LIMIT = 2;

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
  // Commented out (not deleted) rather than the "•••" options menu it drove — replaced by the
  // "+" attach sheet's own rows (filters, quiz/flashcard generation, etc.), but kept in case
  // the menu is needed again.
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

  // Medical research filters — a drill-in from the attach sheet above, sharing the exact same
  // Animated slide-up/down mechanics (and the same iOS Modal-stacking-race workaround) so the
  // handoff between the two sheets looks like one continuous transition instead of an abrupt
  // cut. See the attach-menu block above for what each piece mirrors.
  const filterModalTranslateY = useRef(new Animated.Value(400)).current;
  const filterModalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFilterModalVisible) {
      filterModalTranslateY.setValue(400);
      filterModalOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(filterModalTranslateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(filterModalOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [isFilterModalVisible, filterModalTranslateY, filterModalOpacity]);

  const closeFilterModal = (onComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(filterModalTranslateY, { toValue: 400, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(filterModalOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setIsFilterModalVisible(false);
      onComplete?.();
    });
  };

  const waitForFilterModalToFullyClose = () =>
    new Promise<void>((resolve) => closeFilterModal(() => setTimeout(resolve, 200)));

  /** Backdrop tap / Android hardware back on the filter screen — dismisses everything, all
   *  the way back to the plain chat screen (does NOT reopen the attach sheet). */
  const handleCloseFilterModal = () => closeFilterModal();

  /** The filter screen's back chevron specifically — returns to the "+" attach sheet it was
   *  drilled into from, rather than dismissing all the way out. */
  const handleBackFromFilterModal = async () => {
    await waitForFilterModalToFullyClose();
    setIsAttachMenuVisible(true);
  };

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
  const [attachedSources, setAttachedSources] = useState<{ type: 'note' | 'file'; title: string }[]>([]);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const { alertConfig, showAlert, closeAlert } = useAlertDialog();

  // Generic self-dismissing toast (copy confirmation, pin-limit notice, etc.) — one instance
  // reused for all of them since only one is ever relevant at a time.
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(chatId || null);
  // Mirrors the server's real launch limit for medicalChats (quota.config.ts). Shown for the
  // blank Chat-tab entry point (no session/note/attachment yet) and for an ongoing medical
  // Q&A session; hidden once the user has Pro access.
  const isMedicalContext = isMedical || (!sessionId && !noteId && !fileName && !type);
  const queriesRemaining = !hasAccess && isMedicalContext
    ? Math.max(0, MEDICAL_CHAT_FREE_LIMIT - (user?.freeUsage?.medicalChats?.count ?? 0))
    : null;
  const currentLanguage = getLanguageInfo(user?.preferredLanguage || 'en');
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
  // Mirrors invertedMessages so scrollToMessageTop (called from inside a requestAnimationFrame,
  // after this render has already finished) always reads the current array instead of closing
  // over a stale one from whichever render scheduled the callback.
  const invertedMessagesRef = useRef(invertedMessages);
  useEffect(() => {
    invertedMessagesRef.current = invertedMessages;
  }, [invertedMessages]);

  // Scrolls so the message with this id sits at the TOP of the viewport — the chat is meant to
  // anchor on the query you just sent (or reopened to), not auto-follow the response to the
  // bottom. Only ever called once per query (on send/regenerate/retry/initial load), never from
  // a content-size watcher, so it won't fight you scrolling down to read a long response.
  const scrollToMessageTop = (id: string, animated = true) => {
    const attempt = () => {
      const index = invertedMessagesRef.current.findIndex((m) => m.id === id);
      if (index === -1) return;
      flatListRef.current?.scrollToIndex({ index, viewPosition: 0, viewOffset: 8, animated });
    };
    // Same two-attempt timing as the old scroll-to-bottom logic this replaces: the first run can
    // land before variable-height bubbles above it finish laying out, so retry once more a beat
    // later. onScrollToIndexFailed on the FlatList below covers the rest (item not yet measured).
    requestAnimationFrame(() => {
      attempt();
      setTimeout(attempt, 150);
    });
  };

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
              sources: msg.sources,
              images: msg.images,
              groundingSources: msg.groundingSources,
              followUpQuestions: msg.followUpQuestions,
            }))
          );
          setMessages(loadedMessages);

          // Land on the last query, not the true bottom — same anchoring as a freshly-sent
          // message (see scrollToMessageTop), so reopening a chat looks consistent with sending
          // a new one.
          const lastUserMessage = [...loadedMessages].reverse().find((m) => m.role === 'user');
          if (lastUserMessage) {
            scrollToMessageTop(lastUserMessage.id, false);
          }

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
        showAlert('Error', response.message || 'Failed to update language');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update language');
    }
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

  /** Picks + uploads an image in the background and shows it as a removable thumbnail above
   *  the composer — the actual attach-to-session/create-session call happens on Send (see
   *  handleSendMessage), so the caption typed alongside it goes out as the same action. */
  const pickAndStageImage = async (source: 'camera' | 'library') => {
    await waitForAttachSheetToFullyClose();
    // Checked after the attach sheet (a native Modal) has fully closed — showing the
    // consent modal while it's still animating out causes the same iOS Modal-stacking
    // collision noted elsewhere in this file.
    if (!useAIConsentStore.getState().hasConsented) {
      useAIConsentStore.getState().requestConsent(() => pickAndStageImage(source));
      return;
    }
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
    if (!useAIConsentStore.getState().hasConsented) {
      useAIConsentStore.getState().requestConsent(() => handleUploadFileOption());
      return;
    }
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

  /** Cancels the in-flight streaming response (Stop Generating, or leaving the screen — see the
   *  cleanup in the chatId effect above, which already calls sseChatCleanupRef.current()). The
   *  backend detects the dropped connection and aborts the LLM call server-side. */
  const handleStopGenerating = () => {
    sseChatCleanupRef.current?.();
    sseChatCleanupRef.current = null;
    setIsSendingMessage(false);
  };

  /**
   * Starts a streaming chat request and wires it into `messages` state: an empty assistant
   * placeholder is pushed immediately (renders as a growing bubble via ChatMessageBubble's
   * existing content rendering — no per-message loading UI needed), then grows in place as
   * `chunk` events arrive, gets its citations/images/groundingSources attached on `metadata`,
   * and its follow-up chips + title on `done`. Resolves once the stream finishes so callers can
   * `await` it the same way they awaited the old job-polling flow; rejects on `error`, having
   * already marked that message `status: 'failed'` (ChatMessageBubble renders an inline Retry
   * button for it) — the rejected Error carries `isStreamFailure: true` so callers can tell this
   * apart from an earlier, pre-stream failure that still needs its own alert.
   */
  const streamChatResponse = (
    activeSessionId: string,
    msgContent: string,
    useLiveSearch: boolean,
    options: {
      filters?: MedicalChatFilters;
      excludeImageUrls?: string[];
      attachmentFileId?: string;
      /** Reuse an existing (failed) assistant message's id instead of pushing a new placeholder
       *  — used by handleRetryMessage so a retry updates the same bubble in place. */
      reuseMessageId?: string;
      /** True only for a genuine standalone medical Q&A session (sourceType 'medical_qa' on the
       *  backend) — passed explicitly rather than read from the `isMedical`/`isMedicalContext`
       *  closure, since those can be stale here: this function can run moments after
       *  setIsMedical(true) on the very first message, before React has re-rendered. Used to
       *  optimistically bump the local freeUsage.medicalChats count so the "X QUERY REMAINING"
       *  pill updates immediately instead of waiting for a full app reload. */
      isMedicalQuery?: boolean;
    } = {}
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const placeholderId = options.reuseMessageId ?? `ai-${Date.now()}`;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (options.reuseMessageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, content: '', status: 'loading', sources: undefined, images: undefined, groundingSources: undefined, followUpQuestions: undefined }
              : m
          )
        );
      } else {
        setMessages((prev) => [
          ...prev,
          { id: placeholderId, role: 'assistant', content: '', timestamp: new Date(), status: 'loading' },
        ]);
      }

      // Guards against onDone/onError firing after a manual stop (the underlying connection is
      // aborted synchronously, so this shouldn't race in practice, but a stale late event must
      // never double-settle this promise).
      let settled = false;

      const cleanup = api.streamChatMessage(
        activeSessionId,
        msgContent,
        {
          mode: useLiveSearch ? 'medical_live' : undefined,
          filters: options.filters,
          excludeImageUrls: options.excludeImageUrls,
          attachmentFileId: options.attachmentFileId,
        },
        {
          onMetadata: (metadata: ChatStreamMetadataPayload) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId
                  ? { ...m, sources: metadata.sources, images: metadata.images, groundingSources: metadata.groundingSources }
                  : m
              )
            );
          },
          onChunk: (text: string) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === placeholderId ? { ...m, content: m.content + text } : m))
            );
          },
          onDone: (data: ChatStreamDonePayload) => {
            if (settled) return;
            settled = true;
            sseChatCleanupRef.current = null;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId ? { ...m, status: undefined, followUpQuestions: data.followUpQuestions } : m
              )
            );
            // Present only on the very first exchange — the backend auto-titles the session
            // from what was actually asked, same as ChatGPT/Claude, instead of leaving the
            // generic default.
            if (data.title) {
              setChatTitle(data.title);
            }
            // The backend increments freeUsage.medicalChats.count per query for a medical_qa
            // session (see chat.controller.ts), but that only updates the DB — bump the local
            // copy too so the "X QUERY REMAINING" pill reflects it on this same screen without
            // needing a full app reload. Pro users are unmetered, so skip it for them.
            if (options.isMedicalQuery && !hasAccess) {
              const current = useAuthStore.getState().user;
              if (current) {
                useAuthStore.getState().updateUser({
                  freeUsage: {
                    ...current.freeUsage,
                    medicalChats: { count: (current.freeUsage?.medicalChats?.count ?? 0) + 1 },
                  },
                });
              }
            }
            resolve();
          },
          onError: (errorMessage: string, quotaExceeded?: boolean) => {
            if (settled) return;
            settled = true;
            sseChatCleanupRef.current = null;
            if (quotaExceeded) {
              // Not a retry-able failure — the caller handles showing the paywall and removing
              // its own optimistic user-message bubble, so just drop the empty placeholder here.
              setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
            } else {
              setMessages((prev) =>
                prev.map((m) => (m.id === placeholderId ? { ...m, status: 'failed' } : m))
              );
            }
            const err = new Error(errorMessage) as Error & { isStreamFailure?: boolean; quotaExceeded?: boolean };
            err.isStreamFailure = true;
            err.quotaExceeded = quotaExceeded;
            reject(err);
          },
        }
      );

      // A manual "Stop Generating" must also settle this promise (not just abort the
      // connection) — otherwise the caller's `await` on this promise hangs forever, and with it
      // the `finally` block that resets isSendingRef/isSendingMessage, permanently blocking
      // every future send. Stopping keeps whatever partial text has streamed in so far and
      // clears the loading status (it's a deliberate stop, not a failure, so no Retry button).
      sseChatCleanupRef.current = () => {
        if (settled) return;
        settled = true;
        cleanup();
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? { ...m, status: undefined } : m))
        );
        resolve();
      };
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    if (pendingAttachment?.isUploading) return; // Send button is disabled for this too — belt and suspenders.
    if (isSendingRef.current) return; // A repeated tap while the first send is still in flight — ignore it.
    if (!useAIConsentStore.getState().hasConsented) {
      useAIConsentStore.getState().requestConsent(() => handleSendMessage());
      return;
    }
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
    scrollToMessageTop(tempId);
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
      await streamChatResponse(activeSessionId, msgContent, useLiveSearch, {
        filters: medicalFilters,
        excludeImageUrls: getShownImageUrls(),
        attachmentFileId: attachmentFileIdForMessage,
        isMedicalQuery: activeIsMedical,
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      if (error?.quotaExceeded) {
        // The free-tier medical-question limit was hit on this specific message (checked
        // server-side per query, not per session) — nothing was persisted, so drop the
        // optimistic user bubble too and let the paywall be the only next step.
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        await showInAppPaywall();
      } else if (!error?.isStreamFailure) {
        // A streaming failure already left an inline Retry button on the failed assistant
        // bubble (see streamChatResponse's onError) — no need to also pop an alert and delete
        // the user's message. Only a pre-stream failure (session creation, attach, etc.
        // throwing unexpectedly instead of returning success:false) falls through here.
        showAlert('Error', error.message || 'Failed to send message');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
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
    if (!useAIConsentStore.getState().hasConsented) {
      useAIConsentStore.getState().requestConsent(() => handleConfirmGenerateFlashcards(cardCount));
      return;
    }
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
    if (!useAIConsentStore.getState().hasConsented) {
      useAIConsentStore.getState().requestConsent(() => handleRegenerateResponse(messageIndex));
      return;
    }

    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || userMessageIndex >= messages.length) return;

    const userMessage = messages[userMessageIndex];
    const priorMessages = messages.slice(0, messageIndex);
    setMessages(priorMessages);
    scrollToMessageTop(userMessage.id);
    setIsSendingMessage(true);

    try {
      const useLiveSearch = isMedical || liveSearchEnabled;
      await streamChatResponse(sessionId, userMessage.content, useLiveSearch, {
        filters: medicalFilters,
        excludeImageUrls: getShownImageUrls(priorMessages),
        isMedicalQuery: isMedical,
      });
    } catch (error: any) {
      if (error?.quotaExceeded) {
        setMessages(messages);
        await showInAppPaywall();
      } else if (!error?.isStreamFailure) {
        // See the identical isStreamFailure check in handleSendMessage — a streaming failure
        // already left an inline Retry button on the failed placeholder streamChatResponse just
        // pushed onto `priorMessages`, so reverting to the pre-regenerate `messages` here would
        // wipe that out instead of letting the user retry.
        showAlert('Error', 'Failed to regenerate response');
        setMessages(messages);
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  /**
   * Retries a failed assistant reply in place — same bubble, same position, no truncation of
   * anything sent after it (unlike handleRegenerateResponse, which discards the old answer and
   * everything after it to generate a fresh alternative). Mirrors handleRegenerateResponse's
   * shape otherwise (consent check, useLiveSearch derivation, isStreamFailure-aware catch).
   */
  const handleRetryMessage = async (failedMessageIndex: number) => {
    if (!sessionId) return;
    if (!useAIConsentStore.getState().hasConsented) {
      useAIConsentStore.getState().requestConsent(() => handleRetryMessage(failedMessageIndex));
      return;
    }

    const userMessageIndex = failedMessageIndex - 1;
    if (userMessageIndex < 0 || userMessageIndex >= messages.length) return;

    const failedMessage = messages[failedMessageIndex];
    if (!failedMessage || failedMessage.role !== 'assistant') return;
    const userMessage = messages[userMessageIndex];

    scrollToMessageTop(userMessage.id);
    setIsSendingMessage(true);

    try {
      const useLiveSearch = isMedical || liveSearchEnabled;
      await streamChatResponse(sessionId, userMessage.content, useLiveSearch, {
        filters: medicalFilters,
        excludeImageUrls: getShownImageUrls(messages.slice(0, failedMessageIndex)),
        reuseMessageId: failedMessage.id,
        isMedicalQuery: isMedical,
      });
    } catch (error: any) {
      if (error?.quotaExceeded) {
        await showInAppPaywall();
      } else if (!error?.isStreamFailure) {
        showAlert('Error', 'Failed to retry response');
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  /** The literature APIs fall back to literal strings like "Unknown journal"/"Unknown year"
   *  when a paper has no journal metadata (common for preprints, conference papers, etc.) —
   *  showing that placeholder verbatim reads as a bug ("unknown source"), so treat it the same
   *  as missing and fall back to the actual provider name (Europe PMC / Semantic Scholar /
   *  PubMed) instead, which is always real, known information. */
  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <ChatMessageBubble
      item={item}
      index={index}
      isSendingMessage={isSendingMessage}
      onPreviewImage={setPreviewImage}
      onOpenCitations={setCitationsSheetSources}
      onRegenerate={handleRegenerateResponse}
      onCopy={handleCopyMessage}
      onSelectFollowUp={handleSuggestedQuestion}
      onRetryMessage={handleRetryMessage}
    />
  );

  const renderEmptyChat = () => (
    <ChatEmptyState
      isLoadingSession={isLoadingSession}
      sessionId={sessionId}
      embeddingStatus={embeddingStatus}
      embeddingProgress={embeddingProgress}
      isMedical={isMedical}
      type={type}
      fileName={fileName}
      title={title}
      onSelectTopic={handleSuggestedQuestion}
      onGoBack={handleGoBack}
    />
  );

  // The placeholder assistant bubble (pushed the moment streaming starts, see streamChatResponse)
  // already renders in the list with growing content, so the dots-only TypingIndicator footer
  // is only useful for the brief window before the first chunk arrives — once real text is
  // showing, a separate "typing" indicator below it would just be redundant.
  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = isSendingMessage && (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.content);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ChatHeader
        hasAccess={hasAccess}
        isPinned={isPinned}
        isPinning={isPinning}
        sessionId={sessionId}
        chatTitle={chatTitle}
        embeddingStatus={embeddingStatus}
        embeddingProgress={embeddingProgress}
        currentLanguageFlag={currentLanguage.flag}
        currentLanguageCode={currentLanguage.code}
        onOpenChatList={() => navigation.navigate('ChatList')}
        onUpgrade={() => showInAppPaywall()}
        onTogglePin={handleTogglePin}
        onOpenRename={handleOpenRename}
        onOpenLanguageModal={() => setLanguageModalVisible(true)}
      />

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
          // Deliberately no onContentSizeChange/onLayout auto-scroll-to-bottom here — the chat
          // anchors on the query (see scrollToMessageTop, called from handleSendMessage/
          // initializeChat/regenerate/retry) and stays put as the response streams in below it,
          // rather than auto-following new content to the bottom.
          onScrollToIndexFailed={(info) => {
            // Target row isn't measured yet (outside the currently-rendered window) — let more
            // of the list render, then retry once.
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, viewPosition: 0, viewOffset: 8, animated: true });
            }, 100);
          }}
          // Called immediately (an element), not passed as a bare function reference — FlatList
          // treats ListEmptyComponent-as-function as a component *type*, and renderEmptyChat is
          // redefined every render (every keystroke, since the composer is a controlled input),
          // so passing the function itself made React remount the whole empty state each time —
          // including ChatWelcomeHero's mount-triggered entrance animation, which is what was
          // visibly "reloading".
          ListEmptyComponent={renderEmptyChat()}
          ListFooterComponent={
            <>
              {sessionId && <ChatGeneratedContentSection chatSessionId={sessionId} />}
              {showTypingIndicator && <TypingIndicator />}
            </>
          }
        />

        {/* Input area */}
        <ChatComposer
          isLocked={isLocked}
          onUpgrade={() => showInAppPaywall()}
          queriesRemaining={queriesRemaining}
          insetsBottom={insets.bottom}
          pendingAttachment={pendingAttachment}
          onRemovePendingAttachment={handleRemovePendingAttachment}
          message={message}
          onChangeMessage={setMessage}
          sessionId={sessionId}
          embeddingStatus={embeddingStatus}
          type={type}
          isSendingMessage={isSendingMessage}
          isInputFocused={isInputFocused}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          onOpenAttachMenu={() => setIsAttachMenuVisible(true)}
          onSend={() => withAccess(handleSendMessage)}
          onStopGenerating={handleStopGenerating}
        />
      </KeyboardAvoidingView>

      <Toast
        visible={!!toastMessage}
        message={toastMessage ?? ''}
        onHide={() => setToastMessage(null)}
      />

      <AlertDialog alertConfig={alertConfig} onClose={closeAlert} />

      {(isMedical || liveSearchEnabled) && (
        <MedicalFilterModal
          visible={isFilterModalVisible}
          opacity={filterModalOpacity}
          translateY={filterModalTranslateY}
          onClose={handleCloseFilterModal}
          onBack={handleBackFromFilterModal}
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

      <LanguageSupportModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onSelectLanguage={handleLanguageSelect}
        selectedLanguage={user?.preferredLanguage || 'en'}
      />

      <ChatAttachSheet
        visible={isAttachMenuVisible}
        opacity={attachMenuOpacity}
        translateY={attachMenuTranslateY}
        insetsBottom={insets.bottom}
        onClose={() => closeAttachMenu()}
        onCameraCapture={handleCameraCapture}
        onPhotoLibrary={handlePhotoLibraryOption}
        onUploadFile={handleUploadFileOption}
        hasMessages={messages.length > 0}
        generatingActionId={generatingActionId}
        onGenerateQuiz={() => { closeAttachMenu(); handleGenerateQuizFromChat(); }}
        onGenerateFlashcards={() => { closeAttachMenu(); handleGenerateFlashcardsFromChat(); }}
        liveSearchEnabled={liveSearchEnabled}
        onToggleLiveSearch={toggleLiveSearch}
        isMedical={isMedical}
        semanticScholarEnabled={semanticScholarEnabled}
        pubmedEnabled={pubmedEnabled}
        onToggleLiteratureSource={toggleLiteratureSource}
        onOpenFilters={async () => {
          // Same Modal-stacking race noted above (pickAndStageImage) — presenting the filter
          // modal before the attach sheet's own Modal has fully torn down can make it silently
          // fail to appear, especially on iOS.
          await waitForAttachSheetToFullyClose();
          setIsFilterModalVisible(true);
        }}
      />

      <ChatCitationsSheet
        sources={citationsSheetSources}
        onClose={() => setCitationsSheetSources(null)}
      />

      <ChatImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      <ChatRenameModal
        visible={isRenameModalVisible}
        value={renameValue}
        onChangeValue={setRenameValue}
        onClose={() => setIsRenameModalVisible(false)}
        onSave={handleSaveRename}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
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
});
