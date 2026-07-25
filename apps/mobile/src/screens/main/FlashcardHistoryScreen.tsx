import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  colors,
  spacing,
  typography,
  SearchIcon,
  EmptyFolderLargeIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { NoteSelectDrawer } from '../../components/NoteSelectDrawer';
import { useExportFlashcard } from '../../hooks/useExportFlashcard';
import { ExportSettingsModal } from '../../components/ExportSettingsModal';

type FlashcardHistoryNavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface FlashcardSet {
  _id: string;
  id?: string;
  title: string;
  totalCards: number;
  createdAt: string;
  cardsReviewedCount?: number;
  masteredCount?: number;
  reviewedAt?: string;
}

export const FlashcardHistoryScreen: React.FC = () => {
  const navigation = useNavigation<FlashcardHistoryNavigationProp>();
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [filteredSets, setFilteredSets] = useState<FlashcardSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [noteSelectVisible, setNoteSelectVisible] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<FlashcardSet | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedExportSetId, setSelectedExportSetId] = useState('');
  const [selectedExportSetTitle, setSelectedExportSetTitle] = useState('');
  const { exportFlashcard, isLoading: isExporting, error: exportError } = useExportFlashcard();

  useFocusEffect(
    useCallback(() => {
      loadFlashcardSets();
    }, [])
  );

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredSets(flashcardSets);
    } else {
      const filtered = flashcardSets.filter(set =>
        set.title.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredSets(filtered);
    }
  }, [searchText, flashcardSets]);

  const loadFlashcardSets = async () => {
    try {
      setIsLoading(true);
      const response = await api.getFlashcardSets();
      if (response && response.success) {
        setFlashcardSets(response.data || []);
        setFilteredSets(response.data || []);
      }
    } catch (error) {
      console.error('Error loading flashcard sets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleViewFlashcardSet = (set: FlashcardSet) => {
    navigation.navigate('FlashcardReview', {
      setId: set._id || set.id || '',
      title: set.title,
    });
  };

  const handleDeleteFlashcardSet = async (set: FlashcardSet) => {
    Alert.alert(
      'Delete Flashcard Set',
      `Are you sure you want to delete "${set.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await api.deleteFlashcardSet(set._id || set.id || '');
              setFlashcardSets(flashcardSets.filter(s => (s._id || s.id) !== (set._id || set.id)));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete flashcard set');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleFlashcardSetOptions = (set: FlashcardSet) => {
    setSelectedMenuItem(set);
  };

  const handleExportSet = (setId: string, setTitle: string) => {
    setSelectedExportSetId(setId);
    setSelectedExportSetTitle(setTitle);
    setExportModalVisible(true);
  };

  const handleNewFlashcardSet = (noteId: string, noteTitle: string) => {
    navigation.navigate('CreateFlashcards', {
      noteId,
      noteTitle,
    });
  };

  const renderFlashcardRow = ({ item }: { item: FlashcardSet }) => (
    <View>
      <TouchableOpacity
        style={styles.flashcardRow}
        onPress={() => handleViewFlashcardSet(item)}
        activeOpacity={0.7}
      >
        <View style={styles.flashcardIconContainer}>
          <Text style={styles.flashcardIcon}>{item.totalCards}</Text>
        </View>
        <View style={styles.flashcardInfo}>
          <Text style={styles.flashcardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.flashcardDate}>
            {formatDate(item.reviewedAt || item.createdAt)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleFlashcardSetOptions(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.moreIcon}>•••</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      <View style={styles.separator} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Flashcards</Text>
        <TouchableOpacity
          style={styles.newSetButton}
          onPress={() => setNoteSelectVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.newSetButtonText}>+ New Set</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <SearchIcon size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search flashcards..."
            placeholderTextColor="#BFBFBF"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : filteredSets.length === 0 ? (
        <View style={styles.emptyState}>
          <EmptyFolderLargeIcon size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No flashcards yet</Text>
          <Text style={styles.emptyDescription}>
            Create a flashcard set from a note to get started
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setNoteSelectVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>+ Create Set</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredSets}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={renderFlashcardRow}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Note Select Drawer */}
      <NoteSelectDrawer
        visible={noteSelectVisible}
        onClose={() => setNoteSelectVisible(false)}
        purpose="flashcard"
        onSelectNote={handleNewFlashcardSet}
      />

      {/* ••• Action Sheet Modal */}
      <Modal
        visible={selectedMenuItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMenuItem(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedMenuItem(null)}>
          <View style={styles.menuModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuModalContainer}>
                <View style={styles.menuHandleBar} />
                <TouchableOpacity style={styles.menuModalOption}
                  onPress={() => { if (selectedMenuItem) { handleViewFlashcardSet(selectedMenuItem); setSelectedMenuItem(null); } }}>
                  <Text style={styles.menuModalOptionText}>👁️  View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuModalOption}
                  onPress={() => { if (selectedMenuItem) { handleExportSet(selectedMenuItem._id || selectedMenuItem.id || '', selectedMenuItem.title); setSelectedMenuItem(null); } }}>
                  <Text style={styles.menuModalOptionText}>📤  Export</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuModalOption, styles.menuModalOptionDelete]}
                  onPress={() => { if (selectedMenuItem) { handleDeleteFlashcardSet(selectedMenuItem); setSelectedMenuItem(null); } }}>
                  <Text style={styles.menuModalOptionTextDelete}>🗑️  Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuModalCancel} onPress={() => setSelectedMenuItem(null)}>
                  <Text style={styles.menuModalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Export Modal */}
      <ExportSettingsModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={async (format, includeAnswers) => {
          if (selectedExportSetId) {
            await exportFlashcard(selectedExportSetId, selectedExportSetTitle, format, includeAnswers, true);
            setExportModalVisible(false);
          }
        }}
        title={selectedExportSetTitle}
        isLoading={isExporting}
        error={exportError}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  newSetButton: {
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 8,
  },
  newSetButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.background.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    paddingHorizontal: spacing[3],
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  listContent: {
    paddingHorizontal: spacing[5],
  },
  flashcardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  flashcardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  flashcardIcon: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: '#10B981',
  },
  flashcardInfo: {
    flex: 1,
  },
  flashcardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  flashcardDate: {
    fontSize: typography.fontSize.xs,
    color: '#757575',
  },
  moreButton: {
    padding: spacing[2],
  },
  moreIcon: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: spacing[12],
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
    paddingHorizontal: spacing[8],
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
    marginBottom: spacing[6],
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuModalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing[8],
  },
  menuHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  menuModalOption: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  menuModalOptionDelete: {
    borderBottomWidth: 0,
  },
  menuModalOptionText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  menuModalOptionTextDelete: {
    fontSize: typography.fontSize.base,
    color: '#EF4444',
    fontWeight: typography.fontWeight.medium,
  },
  menuModalCancel: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    marginTop: spacing[2],
    alignItems: 'center',
  },
  menuModalCancelText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
});
