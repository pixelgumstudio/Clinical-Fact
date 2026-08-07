import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
} from '@clinicalfact/design-system';
import api from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { useExportFlashcard } from '../hooks/useExportFlashcard';
import { ExportSettingsModal } from './ExportSettingsModal';

interface FlashcardSet {
  id: string;
  _id?: string;
  title: string;
  totalCards: number;
  createdAt: string;
  cardsReviewedCount?: number;
  masteredCount?: number;
  reviewedAt?: string;
}

interface FlashcardHistoryListProps {
  noteId?: string;
  onFlashcardDeleted?: () => void;
}

type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export const FlashcardHistoryList: React.FC<FlashcardHistoryListProps> = ({
  noteId,
  onFlashcardDeleted,
}) => {
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<FlashcardSet | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedExportSetId, setSelectedExportSetId] = useState<string | null>(null);
  const [selectedExportSetTitle, setSelectedExportSetTitle] = useState<string>('');
  const navigation = useNavigation<MainStackNavigationProp>();
  const { exportFlashcard, isLoading: isExporting, error: exportError } = useExportFlashcard();

  useEffect(() => {
    if (noteId) {
      fetchFlashcardSets();
    }
  }, [noteId]);

  const fetchFlashcardSets = async () => {
    try {
      setIsLoading(true);
      if (!noteId) return;

      const response = await api.getFlashcardsByNote(noteId);
      if (response.success && response.data) {
        setFlashcardSets(response.data);
      }
    } catch (error) {
      console.error('Error fetching flashcard sets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFlashcardSet = async (setId: string, setTitle: string) => {
    Alert.alert(
      'Delete Flashcard Set',
      `Are you sure you want to delete "${setTitle}"?`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await api.deleteFlashcardSet(setId);
              setFlashcardSets(flashcardSets.filter((set) => (set.id || set._id) !== setId));
              onFlashcardDeleted?.();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete flashcard set');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleFlashcardPress = (setId: string, setTitle: string) => {
    navigation.navigate('FlashcardReview', {
      setId: setId || flashcardSets.find(s => (s.id || s._id) === setId)?._id || setId,
      title: setTitle,
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const calculatePercentage = (set: FlashcardSet): number => {
    if (!set.cardsReviewedCount || set.cardsReviewedCount === 0) return 0;
    return Math.round(((set.masteredCount || 0) / set.cardsReviewedCount) * 100);
  };

  const handleExportFlashcard = (setId: string, setTitle: string) => {
    setSelectedExportSetId(setId);
    setSelectedExportSetTitle(setTitle);
    setExportModalVisible(true);
  };

  const handleMenuAction = (action: 'view' | 'export' | 'delete', setId: string, setTitle: string) => {
    if (action === 'view') {
      handleFlashcardPress(setId, setTitle);
    } else if (action === 'export') {
      handleExportFlashcard(setId, setTitle);
    } else if (action === 'delete') {
      handleDeleteFlashcardSet(setId, setTitle);
    }
  };

  if (!noteId) return null;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }

  if (flashcardSets.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Flashcard History</Text>
      <FlatList
        data={flashcardSets}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.flashcardCardContainer}>
            <TouchableOpacity
              style={styles.flashcardCard}
              onPress={() => handleFlashcardPress(item.id || item._id || '', item.title)}
              activeOpacity={0.7}
            >
              <View style={styles.flashcardContent}>
                <View style={styles.statsContainer}>
                  <Text style={styles.totalCardsText}>{item.totalCards}</Text>
                  <Text style={styles.statsLabel}>Cards</Text>
                </View>
                <View style={styles.flashcardInfo}>
                  <Text style={styles.flashcardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.flashcardDate}>
                    {formatDate(item.reviewedAt || item.createdAt)}
                  </Text>
                  {item.cardsReviewedCount !== undefined && (
                    <Text style={styles.flashcardStats}>
                      {item.cardsReviewedCount} reviewed • {calculatePercentage(item)}% mastered
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* Menu Button */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setSelectedMenuItem(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.menuIcon}>•••</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <ExportSettingsModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={async (format, includeAnswers) => {
          if (selectedExportSetId) {
            await exportFlashcard(
              selectedExportSetId,
              selectedExportSetTitle,
              format,
              includeAnswers,
              true
            );
            setExportModalVisible(false);
          }
        }}
        title={selectedExportSetTitle}
        isLoading={isExporting}
        error={exportError}
      />

      {/* Action Menu Modal */}
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
                <TouchableOpacity
                  style={styles.menuModalOption}
                  onPress={() => {
                    if (selectedMenuItem) {
                      handleMenuAction('view', selectedMenuItem.id || selectedMenuItem._id || '', selectedMenuItem.title);
                      setSelectedMenuItem(null);
                    }
                  }}
                >
                  <Text style={styles.menuModalOptionText}>👁️ View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuModalOption}
                  onPress={() => {
                    if (selectedMenuItem) {
                      handleMenuAction('export', selectedMenuItem.id || selectedMenuItem._id || '', selectedMenuItem.title);
                      setSelectedMenuItem(null);
                    }
                  }}
                >
                  <Text style={styles.menuModalOptionText}>📤 Export</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.menuModalOption, styles.menuModalOptionDelete]}
                  onPress={() => {
                    if (selectedMenuItem) {
                      handleMenuAction('delete', selectedMenuItem.id || selectedMenuItem._id || '', selectedMenuItem.title);
                      setSelectedMenuItem(null);
                    }
                  }}
                >
                  <Text style={styles.menuModalOptionTextDelete}>🗑️ Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuModalCancel}
                  onPress={() => setSelectedMenuItem(null)}
                >
                  <Text style={styles.menuModalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[6],
    marginBottom: spacing[4],
    marginHorizontal: spacing[5],
  },
  loadingContainer: {
    marginTop: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
  },
  heading: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  flashcardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderLeftWidth: 4,
    borderLeftColor: '#10B981', // Green for flashcards
  },
  flashcardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  statsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  totalCardsText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: '#10B981',
  },
  statsLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  flashcardInfo: {
    flex: 1,
    paddingRight: spacing[12],
  },
  flashcardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[1],
    paddingRight: spacing[4],
  },
  flashcardDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  flashcardStats: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  deleteButton: {
    padding: spacing[2],
  },
  flashcardCardContainer: {
    position: 'relative',
    marginBottom: spacing[3],
  },
  menuButton: {
    position: 'absolute',
    right: spacing[4],
    top: spacing[4],
    padding: spacing[2],
    zIndex: 10,
  },
  menuIcon: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
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
