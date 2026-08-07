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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  colors,
  spacing,
  typography,
} from '@clinicalfact/design-system';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import api from '../services/api';
import { useExportQuiz } from '../hooks/useExportQuiz';
import { ExportSettingsModal } from './ExportSettingsModal';

type QuizHistoryNavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface Quiz {
  id: string;
  _id?: string;
  title: string;
  totalQuestions: number;
  createdAt: string;
  correctAnswers?: number;
}

interface QuizHistoryListProps {
  noteId?: string;
}

export const QuizHistoryList: React.FC<QuizHistoryListProps> = ({ noteId }) => {
  const navigation = useNavigation<QuizHistoryNavigationProp>();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMenuItem, setSelectedMenuItem] = useState<Quiz | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedExportQuizId, setSelectedExportQuizId] = useState<string | null>(null);
  const [selectedExportQuizTitle, setSelectedExportQuizTitle] = useState<string>('');
  const { exportQuiz, isLoading: isExporting, error: exportError } = useExportQuiz();

  useEffect(() => {
    if (noteId) {
      loadQuizzes();
    }
  }, [noteId]);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      const response = await api.getQuizzesByNote(noteId || '');
      if (response && response.success) {
        setQuizzes(response.data || []);
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuAction = (action: string, quizId: string, quizTitle: string) => {
    switch (action) {
      case 'view':
        navigation.navigate('QuizReview', {
          quizId,
          title: quizTitle,
          mode: 'review',
        });
        break;
      case 'export':
        handleExportQuiz(quizId, quizTitle);
        break;
      case 'delete':
        handleDeleteQuiz(quizId, quizTitle);
        break;
      case 'cancel':
        break;
    }
  };

  const handleExportQuiz = (quizId: string, quizTitle: string) => {
    setSelectedExportQuizId(quizId);
    setSelectedExportQuizTitle(quizTitle);
    setExportModalVisible(true);
  };

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    Alert.alert(
      'Delete Quiz',
      `Are you sure you want to delete "${quizTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await api.deleteQuiz(quizId);
              setQuizzes(quizzes.filter(q => (q.id || q._id) !== quizId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete quiz');
            }
          },
          style: 'destructive',
        },
      ]
    );
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (quizzes.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Quiz History</Text>
      <FlatList
        data={quizzes}
        keyExtractor={(item) => item.id || item._id || Math.random().toString()}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.quizCardContainer}>
            <TouchableOpacity
              style={styles.quizCard}
              onPress={() => handleMenuAction('view', item.id || item._id || '', item.title)}
              activeOpacity={0.7}
            >
              <View style={styles.quizContent}>
                {/* Stats Container */}
                <View style={styles.statsContainer}>
                  <Text style={styles.totalQuestionsText}>{item.totalQuestions}</Text>
                  <Text style={styles.statsLabel}>Questions</Text>
                </View>

                {/* Quiz Info */}
                <View style={styles.quizInfo}>
                  <Text style={styles.quizTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.quizDate}>
                    {formatDate(item.createdAt)}
                  </Text>
                  <Text style={styles.quizStats}>
                    {item.correctAnswers || 0} correct
                  </Text>
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
          if (selectedExportQuizId) {
            await exportQuiz(
              selectedExportQuizId,
              selectedExportQuizTitle,
              format,
              includeAnswers,
              true
            );
            setExportModalVisible(false);
          }
        }}
        title={selectedExportQuizTitle}
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
  quizCardContainer: {
    position: 'relative',
    marginBottom: spacing[3],
  },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: spacing[4],
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6', // Blue for quizzes
  },
  quizContent: {
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
  totalQuestionsText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: '#3B82F6', // Blue for quizzes
  },
  statsLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  quizInfo: {
    flex: 1,
    paddingRight: spacing[12],
  },
  quizTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[1],
    paddingRight: spacing[4],
  },
  quizDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  quizStats: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
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
