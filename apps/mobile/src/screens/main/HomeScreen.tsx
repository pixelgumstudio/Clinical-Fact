import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  spacing,
  typography,
  AudioWaveLogoIcon,
  ChevronDownIcon,
  EmptyFolderIcon,
  CreateNotesIcon,
  ChatPDFIcon,
  QuizIcon,
  FlashcardIcon,
  ChevronRightIcon,
  NoteCard,
} from '@clinicfact/design-system';
import { CreateNoteModal } from '../../components/CreateNoteModal';
import { LanguageSupportModal } from '../../components/LanguageSupportModal';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { useNotes, useRefetchOnFocus } from '../../hooks/queries';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useGatedFeature } from '../../hooks/useGatedFeature';
import { useFlashcardSync } from '../../hooks/useFlashcardSync';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';

type HomeNavigationProp = NativeStackNavigationProp<MainStackParamList>;

type NoteCardType = 'audio' | 'text' | 'pdf' | 'video' | 'image' | 'youtube';

const mapSourceType = (sourceType: string): NoteCardType => {
  switch (sourceType) {
    case 'upload_audio':
    case 'record_audio':
    case 'audio':
      return 'audio';
    case 'youtube':
      return 'youtube';
    case 'pdf':
    case 'pdf_document':
      return 'pdf';
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    default:
      return 'text';
  }
};

const getLanguageInfo = (code: string): { flag: string; code: string } => {
  const languageMap: Record<string, { flag: string; code: string }> = {
    en: { flag: '🇺🇸', code: 'En' },
    es: { flag: '🇪🇸', code: 'Es' },
    fr: { flag: '🇫🇷', code: 'Fr' },
    de: { flag: '🇩🇪', code: 'De' },
    pt: { flag: '🇵🇹', code: 'Pt' },
    'zh-CN': { flag: '🇨🇳', code: 'Zh' },
    'zh-TW': { flag: '🇹🇼', code: 'Zh' },
    ja: { flag: '🇯🇵', code: 'Ja' },
    ko: { flag: '🇰🇷', code: 'Ko' },
    ar: { flag: '🇸🇦', code: 'Ar' },
    hi: { flag: '🇮🇳', code: 'Hi' },
    ru: { flag: '🇷🇺', code: 'Ru' },
    it: { flag: '🇮🇹', code: 'It' },
    pl: { flag: '🇵🇱', code: 'Pl' },
    nl: { flag: '🇳🇱', code: 'Nl' },
    sv: { flag: '🇸🇪', code: 'Sv' },
    tr: { flag: '🇹🇷', code: 'Tr' },
    vi: { flag: '🇻🇳', code: 'Vi' },
    th: { flag: '🇹🇭', code: 'Th' },
    id: { flag: '🇮🇩', code: 'Id' },
  };
  return languageMap[code] || { flag: '🇺🇸', code: 'En' };
};

export const HomeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { data: rawNotes = [], isLoading, refetch } = useNotes({ limit: 10, page: 1 });
  const notes = rawNotes.slice(0, 10);
  useRefetchOnFocus(refetch);
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

  const handleOpenCreateModal = () => {
    setCreateModalVisible(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalVisible(false);
  };

  const handleSelectCreateOption = (optionType: string) => {
    handleCloseCreateModal();
    switch (optionType) {
      case 'upload_audio':
        navigation.navigate('UploadAudio');
        break;
      case 'record_audio':
        navigation.navigate('RecordAudio');
        break;
      case 'youtube':
        navigation.navigate('YouTubeInput');
        break;
      case 'pdf_document':
        navigation.navigate('UploadPDF');
        break;
      case 'custom_text':
        navigation.navigate('CustomTextInput');
        break;
      case 'image':
        navigation.navigate('UploadImage');
        break;
      default:
        break;
    }
  };

  const handleChatWithPDF = () => {
    withAccess(() => (navigation as any).navigate('ChatFileSelect', { type: 'document' }));
  };

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      setLanguageModalVisible(false);

      // Change app language immediately (i18n)
      await changeLanguage(languageCode);

      // Update user preference in backend
      const response = await api.updateUserLanguage(languageCode);

      if (response.success && response.data?.user) {
        // Update local user state with the full user data from API
        const updatedUserData = response.data.user;
        await useAuthStore.getState().updateUser({
          preferredLanguage: updatedUserData.preferredLanguage || languageCode,
        });

        Alert.alert('Success', 'Language preference updated');
      } else {
        Alert.alert('Error', response.message || 'Failed to update language');
      }
    } catch (error: any) {
      console.error('Language update error:', error);
      Alert.alert('Error', error.message || 'Failed to update language');
    }
  };

  const currentLanguage = getLanguageInfo(user?.preferredLanguage || 'en');

  const renderNoteItem = useCallback(({ item: note }: { item: any }) => (
    <NoteCard
      style={styles.noteCardSpacing}
      note={{
        id: note._id,
        name: note.title || 'Untitled Note',
        type: mapSourceType(note.sourceType),
        createdAt: new Date(note.createdAt),
        // transcription: note.summary,
      }}
      onPress={() => navigation.navigate('NoteDetail', {
        noteId: note._id,
        title: note.title || 'Untitled Note',
      })}
    />
  ), [navigation]);

  const ListHeader = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AudioWaveLogoIcon size={28} />
          <Text style={styles.logoText}>{t('home.title')}</Text>
          <View style={[styles.statusBadge, hasAccess ? styles.proBadge : styles.freeBadge]}>
            <Text style={[styles.statusBadgeText, hasAccess ? styles.proBadgeText : styles.freeBadgeText]}>
              {hasAccess ? t('profile.pro') : t('profile.free')}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => setLanguageModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.flagIcon}>{currentLanguage.flag}</Text>
            <Text style={styles.languageText}>{currentLanguage.code}</Text>
            <ChevronDownIcon size={14} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feature Cards - 2x2 Grid */}
      <View style={styles.featureCards}>
        {/* Card 1: Capture Notes */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleOpenCreateModal}
          style={styles.featureCardTouchable}
        >
          <LinearGradient
            colors={['#FFEBEA', '#CBEAFF', '#FBD0CD', '#B9EDBA']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureCard}
          >
            <View style={styles.featureCardTop}>
              <CreateNotesIcon size={24} />
              <ChevronRightIcon size={24} color="#A6A6A6" />
            </View>
            <View>
              <Text style={styles.featureCardTitle}>Capture Notes</Text>
              <Text style={styles.featureCardDescription}>Record, paste, or upload to start</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Card 2: Chat Smart */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleChatWithPDF}
          style={styles.featureCardTouchable}
        >
          <LinearGradient
            colors={['#CBEAFF', '#DAFADB', '#CCFBF1', '#2DD4C0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureCard}
          >
            <View style={styles.featureCardTop}>
              <ChatPDFIcon size={24} />
              <ChevronRightIcon size={24} color="#A6A6A6" />
            </View>
            <View>
              <Text style={styles.featureCardTitle}>Chat Smart</Text>
              <Text style={styles.featureCardDescription}>Ask questions about any note, Chat with PDF & Doc</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Card 3: Practice Tests */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('QuizHistoryScreen')}
          style={styles.featureCardTouchable}
        >
          <LinearGradient
            colors={['#F6FEE7', '#BAED65', '#B5D975', '#F0EAAA']}
            start={{ x: 0.296, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.featureCard}
          >
            <View style={styles.featureCardTop}>
              <QuizIcon size={24} />
              <ChevronRightIcon size={24} color="#A6A6A6" />
            </View>
            <View>
              <Text style={styles.featureCardTitle}>Practice Tests</Text>
              <Text style={styles.featureCardDescription}>Auto-generate quizzes instantly</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Card 4: Make Flashcards */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('FlashcardHistoryScreen')}
          style={styles.featureCardTouchable}
        >
          <LinearGradient
            colors={['#DCEEB9', '#FFB09C', '#EBE19F', '#F9C597']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureCard}
          >
            <View style={styles.featureCardTop}>
              <FlashcardIcon size={24} />
              <ChevronRightIcon size={24} color="#A6A6A6" />
            </View>
            <View>
              <Text style={styles.featureCardTitle}>Make flashcards</Text>
              <Text style={styles.featureCardDescription}>Master concepts with spaced rep</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Notes section header — only when there are notes */}
      {!isLoading && notes.length > 0 && (
        <View style={[styles.notesSection, { paddingBottom: 0 }]}>
          <View style={styles.notesSectionHeader}>
            <Text style={styles.notesTitle}>{t('home.recentNotes')}</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Library' })}>
              <Text style={styles.viewAllLink}>{t('home.seeAll')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.neutral[900]} />
              <Text style={styles.loadingText}>{t('home.loadingNotes')}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : notes.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={
            <View style={styles.emptyState}>
              <EmptyFolderIcon size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>{t('home.noNotes')}</Text>
              <Text style={styles.emptyDescription}>{t('home.noNotesDesc')}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item._id}
          renderItem={renderNoteItem}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notesSection}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
        />
      )}

      <CreateNoteModal
        visible={isCreateModalVisible}
        onClose={handleCloseCreateModal}
        onSelectOption={handleSelectCreateOption}
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
    backgroundColor: colors.background.primary,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  logoText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginLeft: spacing[2],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing[2],
  },
  proBadge: {
    backgroundColor: '#6366F1',
  },
  freeBadge: {
    backgroundColor: '#9CA3AF',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  proBadgeText: {
    color: '#FFFFFF',
  },
  freeBadgeText: {
    color: '#FFFFFF',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  flagIcon: {
    fontSize: 16,
  },
  languageText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginRight: 4,
  },
  // Feature Cards
  featureCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  featureCardTouchable: {
    width: '47%',
  },
  featureCard: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: 16,
    minHeight: 127,
    height: 150,
    overflow: 'hidden',
    gap: spacing[6],
  },
  featureCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1C',
    letterSpacing: -0.14,
    marginBottom: spacing[1],
  },
  featureCardDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: '#1C1C1C',
    letterSpacing: -0.24,
    lineHeight: 16,
  },
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  emptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  notesSection: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  notesTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  viewAllLink: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#F97316',
  },
  noteCardSpacing: {
    marginBottom: spacing[3],
  },
});
