import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import * as StoreReview from 'react-native-store-review';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RichText } from '../../components/RichText';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { useDeleteNote, useFolders } from '../../hooks/queries';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  MoreVerticalIcon,
  FolderAddIcon,
  TranslateIcon,
  TranscribeIcon,
  EditPencilIcon,
  FlashcardIcon,
  QuizIcon,
  DocumentFileIcon,
  FolderColorIcon,
  ChevronRightIcon,
} from '@clinicalfact/design-system';
import { FeedbackFilterModal } from '../../components/FeedbackFilterModal';
import { LanguageSupportModal } from '../../components/LanguageSupportModal';
import { NoteOptionsModal } from '../../components/NoteOptionsModal';
import { DeleteNoteModal } from '../../components/DeleteNoteModal';
import { ExportNoteModal, ExportType } from '../../components/ExportNoteModal';
import { ExportFormatModal } from '../../components/ExportFormatModal';
import { FoldersModal, Folder } from '../../components/FoldersModal';
import { CreateQuizModal } from '../../components/CreateQuizModal';
// import { HtmlRenderer } from '../../components/HtmlRenderer';
import { QuizHistoryList } from '../../components/QuizHistoryList';
import { FlashcardHistoryList } from '../../components/FlashcardHistoryList';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { shouldShowFeedback, recordFeedbackShown, resetFeedbackCooldown } from '../../utils/feedbackManager';
import { useGatedFeature } from '../../hooks/useGatedFeature';

type NoteDetailRouteProp = RouteProp<MainStackParamList, 'NoteDetail'>;
type NoteDetailNavigationProp = NativeStackNavigationProp<MainStackParamList, 'NoteDetail'>;

type TabType = 'summary' | 'quiz' | 'flashcards';

export const NoteDetailScreen = () => {
  const navigation = useNavigation<NoteDetailNavigationProp>();
  const route = useRoute<NoteDetailRouteProp>();
  const deleteNoteMutation = useDeleteNote();
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  // Modal states
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isNoteOptionsVisible, setNoteOptionsVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isExportModalVisible, setExportModalVisible] = useState(false);
  const [isExportFormatVisible, setExportFormatVisible] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<ExportType | null>(null);
  const [isFoldersModalVisible, setFoldersModalVisible] = useState(false);
  const [isQuizModalVisible, setQuizModalVisible] = useState(false);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const { withAccess } = useGatedFeature();

  // Folder state — sourced from React Query cache (single source of truth)
  const { data: folders = [], refetch: refetchFolders } = useFolders('note');
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  // Note data state
  const [noteData, setNoteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setFlashcardRefreshTrigger] = useState(0);

  // Reload note data when screen comes back into focus (e.g. after editing)
  useFocusEffect(
    React.useCallback(() => {
      loadNoteData();
    }, [route.params?.noteId])
  );

  // Sync selectedFolder when noteData or folders change
  useEffect(() => {
    if (!noteData) return;
    if (noteData.folderId && folders.length > 0) {
      const folder = folders.find(
        (f) => f._id === noteData.folderId || f.id === noteData.folderId
      );
      setSelectedFolder(folder ?? null);
    } else if (!noteData.folderId) {
      setSelectedFolder(null);
    }
  }, [noteData?.folderId, folders]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    shouldShowFeedback().then((eligible) => {
      if (!eligible) return;
      timer = setTimeout(() => {
        setIsFeedbackModalVisible(true);
        recordFeedbackShown().catch(() => {});
        Animated.timing(feedbackOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }).start();
      }, 5000);
    });
    return () => clearTimeout(timer);
  }, []);

  const loadNoteData = async () => {
    try {
      setIsLoading(true);
      const response = await api.getNoteById(route.params?.noteId);

      if (response.success && response.data) {
        setNoteData(response.data);
      } else {
        Alert.alert('Error', 'Failed to load note');
        navigation.navigate('MainTabs', { screen: 'Home' } as any);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load note');
      navigation.navigate('MainTabs', { screen: 'Home' } as any);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackHappy = () => {
    setIsFeedbackModalVisible(false);
    resetFeedbackCooldown().catch(() => {});
    try { StoreReview.requestReview(); } catch {}
    api.submitFeedback({ noteId: route.params?.noteId, isPositive: true }).catch(() => {});
  };

  const handleFeedbackSad = (comment: string) => {
    setIsFeedbackModalVisible(false);
    resetFeedbackCooldown().catch(() => {});
    api.submitFeedback({ noteId: route.params?.noteId, isPositive: false, comment }).catch(() => {});
  };

  const handleFeedbackLater = () => {
    setIsFeedbackModalVisible(false);
    resetFeedbackCooldown().catch(() => {});
  };

  const handleGoBack = () => {
    // Always navigate to dashboard (Home screen) instead of going back
    navigation.navigate('MainTabs', { screen: 'Home' } as any);
  };

  const handleOpenNoteOptions = () => {
    setNoteOptionsVisible(true);
  };

  const handleTranslate = () => {
    withAccess(() => setLanguageModalVisible(true));
  };

  const handleTranscribe = () => {
    navigation.navigate('NoteTranscript', {
      noteId: route.params?.noteId || '1',
      title: noteData.title,
    });
  };

  const handleReTranscribe = async () => {
    setNoteOptionsVisible(false);

    Alert.alert(
      'Re-transcribe Note',
      'This will re-transcribe the audio and update the note. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Re-transcribe',
          onPress: async () => {
            try {
              setIsLoading(true);
              const response = await api.retranscribeNote(route.params?.noteId || '');

              if (response.success) {
                Alert.alert('Success', 'Note re-transcribed successfully');
                loadNoteData(); // Reload note data
              } else {
                Alert.alert('Info', response.message || 'Re-transcription feature is coming soon');
              }
            } catch (error: any) {
              Alert.alert('Info', error.message || 'Re-transcription feature is coming soon');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditNote = () => {
    setNoteOptionsVisible(false);
    navigation.navigate('EditNote', {
      noteId: route.params?.noteId || '1',
      title: noteData.title,
      content: noteData.content,
    });
  };

  const handleExportNote = () => {
    setNoteOptionsVisible(false);
    setExportModalVisible(true);
  };

  // const handlePrintNote = async () => { /* print removed */ };

  const handleDeleteNote = () => {
    setNoteOptionsVisible(false);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    setDeleteModalVisible(false);
    deleteNoteMutation.mutate(route.params?.noteId || '', {
      onSuccess: () => navigation.navigate('MainTabs', { screen: 'Home' } as any),
      onError: (err: any) => {
        const message =
          err?.message === 'OFFLINE_ACTION_BLOCKED'
            ? 'You are currently offline. Please connect to the internet to perform this action.'
            : err?.message || 'Failed to delete note';
        Alert.alert('Error', message);
      },
    });
  };

  const handleSelectExportType = (type: ExportType) => {
    setExportModalVisible(false);
    setSelectedExportType(type);
    setExportFormatVisible(true);
  };

  const handleExportFormat = async (format: string) => {
    setExportFormatVisible(false);
    if (!selectedExportType || !route.params?.noteId) return;

    try {
      setIsLoading(true);
      const response = await api.exportNote(route.params.noteId, selectedExportType, format);

      if (!response.success || !response.data) {
        Alert.alert('Error', response.message || 'Failed to export note');
        return;
      }

      const { title, textContent, htmlContent, filename } = response.data;
      const safeFilename = filename || 'note';

      if (format === 'txt') {
        const fileUri = `${FileSystem.documentDirectory}${safeFilename}.txt`;
        await FileSystem.writeAsStringAsync(fileUri, textContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: `Export "${title}"`,
          UTI: 'public.plain-text',
        });
      } else if (format === 'pdf') {
        const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body{font-family:-apple-system,Helvetica,sans-serif;font-size:14px;color:#374151;line-height:1.7;padding:24px 32px;}
          h1{font-size:22px;color:#1C1C1C;margin-bottom:8px;}
          h2{font-size:17px;color:#1C1C1C;margin-top:24px;margin-bottom:6px;}
          h3{font-size:15px;color:#1C1C1C;}
          p{margin:0 0 12px;}
          li{margin-bottom:6px;}
          code{background:#F3F4F6;padding:2px 4px;border-radius:3px;font-family:Courier,monospace;}
        </style></head><body><h1>${title}</h1>${htmlContent}</body></html>`;
        const { uri } = await Print.printToFileAsync({ html: htmlDoc, base64: false });
        const destUri = `${FileSystem.documentDirectory}${safeFilename}.pdf`;
        await FileSystem.moveAsync({ from: uri, to: destUri });
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Export "${title}"`,
          UTI: 'com.adobe.pdf',
        });
      } else if (format === 'doc' || format === 'docx') {
        const rtfEscape = (s: string) =>
          s
            .replace(/\\/g, '\\\\')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/[^\x20-\x7E\n]/g, (c) => `\\'${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
        const rtfBody = rtfEscape(textContent).replace(/\n/g, '\\par\n');
        const rtfContent = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}{\\f0\\fs24 {\\b\\fs28 ${rtfEscape(title)}}\\par\\par\n${rtfBody}\n}}`;
        const fileUri = `${FileSystem.documentDirectory}${safeFilename}.doc`;
        await FileSystem.writeAsStringAsync(fileUri, rtfContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/msword',
          dialogTitle: `Export "${title}"`,
          UTI: 'com.microsoft.word.doc',
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageSelect = async (languageCode: string) => {
    setLanguageModalVisible(false);
    try {
      setIsLoading(true);
      const response = await api.translateNote(route.params?.noteId, languageCode);
      if (response.success) {
        await loadNoteData();
        Alert.alert('Success', 'Note translated successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to translate note');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to translate note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFolders = () => {
    setFoldersModalVisible(true);
  };

  const handleSelectFolder = async (folderId: string | null) => {
    try {
      const response = await api.moveNoteToFolder(route.params?.noteId, folderId);

      if (response.success) {
        const folder = folderId ? folders.find(f => (f._id === folderId || f.id === folderId)) : null;
        setSelectedFolder(folder ?? null);
        setFoldersModalVisible(false);
        await Promise.all([loadNoteData(), refetchFolders()]);
        Alert.alert('Success', `Note moved to ${folder?.name || 'uncategorized'}`);
      } else {
        Alert.alert('Error', response.message || 'Failed to move note to folder');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to move note to folder');
    }
  };

  const handleOpenQuizModal = () => {
    withAccess(() => setQuizModalVisible(true));
  };

  const handleGenerateQuiz = (questionCount: number, timeInMinutes: number) => {
    setQuizModalVisible(false);
    // Navigate to Quiz screen with configuration parameters.
    // The Quiz screen should handle the actual API call/generation on mount.
    navigation.navigate('Quiz', {
      noteId: route.params?.noteId || '',
      noteTitle: noteData.title,
      questionCount,
      timeInMinutes,
    });
  };

  const handleCreateFlashcards = () => {
    withAccess(() =>
      navigation.navigate('CreateFlashcards', {
        noteId: route.params?.noteId || '',
        noteTitle: noteData.title,
      })
    );
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'summary', label: 'Summary Notes' },
    // { key: 'quiz', label: 'Add Quiz' },
    // { key: 'flashcards', label: 'Add Flashcards' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={colors.neutral[900]} />
          <Text style={styles.loadingText}>Loading note...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!noteData) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeftIcon size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {noteData.title.length > 20
            ? `${noteData.title.substring(0, 20)}...`
            : noteData.title}
        </Text>
        <TouchableOpacity style={styles.moreButton} onPress={handleOpenNoteOptions}>
          <MoreVerticalIcon size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Note Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.noteTitle}>{noteData.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.noteDate}>
              {new Date(noteData.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            {/* <TouchableOpacity
              style={styles.addToFolderButton}
              onPress={handleOpenFolders}
            >
              {selectedFolder ? (
                <>
                  <FolderColorIcon size={18} folderColor={selectedFolder.color} />
                  <Text style={styles.selectedFolderText} numberOfLines={1}>
                    {selectedFolder.name.length > 15
                      ? `${selectedFolder.name.substring(0, 15)}...`
                      : selectedFolder.name}
                  </Text>
                  <ChevronRightIcon size={16} color="#6B7280" />
                </>
              ) : (
                <>
                  <FolderAddIcon size={18} color="#F97316" />
                  <Text style={styles.addToFolderText}>Add to folder</Text>
                  <ChevronRightIcon size={16} color="#F97316" />
                </>
              )}
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Source File Card */}
        <View style={styles.sourceFileCard}>
          <DocumentFileIcon size={40} />
          <View style={styles.sourceFileInfo}>
            <Text style={styles.sourceFileName}>
              {noteData.sourceType === 'image' ? 'Image Note' : noteData.title}
            </Text>
            <Text style={styles.sourceFileDate}>
              Created {new Date(noteData.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleTranslate}
          >
            <TranslateIcon size={18} color="#6B7280" />
            <Text style={styles.actionButtonText}>Translate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleTranscribe}
          >
            <TranscribeIcon size={18} color="#6B7280" />
            <Text style={styles.actionButtonText}>Transcribe</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Note Button */}
        <TouchableOpacity style={styles.editButton} onPress={handleEditNote}>
          <EditPencilIcon size={18} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Edit this note</Text>
        </TouchableOpacity>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Flashcards Card */}
        {activeTab === 'flashcards' && (
          <>
            <TouchableOpacity activeOpacity={0.9} onPress={handleCreateFlashcards}>
              <LinearGradient
                colors={['#DCFCE7', '#FEE2E2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flashcardsCard}
              >
                <FlashcardIcon size={48} />
                <Text style={styles.flashcardsTitle}>Create flashcards</Text>
                <Text style={styles.flashcardsDescription}>
                  Create flashcards to improve your{'\n'}retention skills
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Flashcard History List */}
            <FlashcardHistoryList
              noteId={route.params?.noteId}
              onFlashcardDeleted={() => setFlashcardRefreshTrigger(prev => prev + 1)}
            />
          </>
        )}

        {/* Quiz Card */}
        {activeTab === 'quiz' && (
          <>
            <TouchableOpacity activeOpacity={0.9} onPress={handleOpenQuizModal}>
              <LinearGradient
                colors={['#DBEAFE', '#FCD0D0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quizCard}
              >
                <QuizIcon size={48} />
                <Text style={styles.quizTitle}>Create Quiz questions</Text>
                <Text style={styles.quizDescription}>
                  Practice your notes by creating{'\n'}questions that help you master the{'\n'}topic
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <QuizHistoryList noteId={route.params?.noteId} />
          </>
        )}

        {/* Summary Notes Content */}
        {activeTab === 'summary' && (
          <View style={styles.summaryContent}>
            {noteData.summary && (
              <RichText content={noteData.summary} containerStyle={styles.richTextContainer} />
            )}

            {noteData.content && (
              <RichText content={noteData.content} containerStyle={styles.richTextContainer} />
            )}
          </View>
        )}
      </ScrollView>

      {/* Feedback Modal */}
      <Animated.View style={{ opacity: feedbackOpacity }}>
        <FeedbackFilterModal
          visible={isFeedbackModalVisible}
          noteId={route.params?.noteId}
          onHappy={handleFeedbackHappy}
          onSad={handleFeedbackSad}
          onLater={handleFeedbackLater}
        />
      </Animated.View>

      {/* Language Support Modal */}
      <LanguageSupportModal
        visible={isLanguageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onSelectLanguage={handleLanguageSelect}
      />

      {/* Note Options Modal */}
      <NoteOptionsModal
        visible={isNoteOptionsVisible}
        onClose={() => setNoteOptionsVisible(false)}
        onEditNote={handleEditNote}
        onChatWithNote={() => {
          navigation.navigate('ChatConversation', {
            noteId: route.params?.noteId,
            title: noteData?.title || route.params?.title || 'Note',
            type: 'note',
          });
        }}
        onReTranscribe={handleReTranscribe}
        onExportNote={handleExportNote}
        onPrintNote={() => {}}
        onDeleteNote={handleDeleteNote}
        hasAudioSource={noteData?.sourceType === 'audio' || noteData?.sourceType === 'video'}
      />

      {/* Delete Note Modal */}
      <DeleteNoteModal
        visible={isDeleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Export Note Modal */}
      <ExportNoteModal
        visible={isExportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onSelectExportType={handleSelectExportType}
      />

      {/* Export Format Modal */}
      <ExportFormatModal
        visible={isExportFormatVisible}
        exportType={selectedExportType}
        onClose={() => setExportFormatVisible(false)}
        onExport={handleExportFormat}
      />

      {/* Folders Modal */}
      <FoldersModal
        visible={isFoldersModalVisible}
        onClose={() => setFoldersModalVisible(false)}
        onSelectFolder={handleSelectFolder}
        onFolderCreated={refetchFolders}
        folders={folders}
        selectedFolderId={selectedFolder?._id || selectedFolder?.id}
      />

      {/* Create Quiz Modal */}
      <CreateQuizModal
        visible={isQuizModalVisible}
        onClose={() => setQuizModalVisible(false)}
        onGenerateQuiz={handleGenerateQuiz}
        noteTitle={noteData.title}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing[1],
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'center',
    marginHorizontal: spacing[3],
  },
  moreButton: {
    padding: spacing[1],
  },
  scrollView: {
    flex: 1,
  },
  titleSection: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  noteTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  addToFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addToFolderText: {
    fontSize: typography.fontSize.sm,
    color: '#F97316',
    marginLeft: spacing[1],
    marginRight: spacing[1],
  },
  selectedFolderText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    marginLeft: spacing[1],
    marginRight: spacing[1],
    maxWidth: 120,
  },
  sourceFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[5],
    padding: spacing[4],
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sourceFileInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  sourceFileName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  sourceFileDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing[5],
    marginTop: spacing[4],
    gap: spacing[3],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    backgroundColor: colors.neutral[100],
    borderRadius: 10,
    gap: spacing[2],
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing[5],
    marginTop: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: colors.neutral[900],
    borderRadius: 12,
    gap: spacing[2],
  },
  editButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[5],
    marginTop: spacing[6],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    paddingVertical: spacing[3],
    marginRight: spacing[5],
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.neutral[900],
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  activeTabText: {
    color: colors.text.primary,
  },
  flashcardsCard: {
    margin: spacing[5],
    padding: spacing[6],
    borderRadius: 16,
    alignItems: 'center',
  },
  flashcardsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  flashcardsDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  quizCard: {
    margin: spacing[5],
    padding: spacing[6],
    borderRadius: 16,
    alignItems: 'center',
  },
  quizTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  quizDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
    paddingBottom: spacing[8],
  },
  summaryTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[3],
    lineHeight: 26,
  },
  summaryParagraph: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  subsectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  bulletList: {
    marginBottom: spacing[3],
  },
  bulletItem: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing[1],
  },
  boldText: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  contentText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  richTextContainer: {
    marginBottom: 8,
  },
});