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
import { useExportQuiz } from '../../hooks/useExportQuiz';
import { ExportSettingsModal } from '../../components/ExportSettingsModal';

type QuizHistoryNavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface Quiz {
  _id: string;
  id?: string;
  title: string;
  totalQuestions: number;
  createdAt: string;
  correctAnswers?: number;
}

export const QuizHistoryScreen: React.FC = () => {
  const navigation = useNavigation<QuizHistoryNavigationProp>();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [noteSelectVisible, setNoteSelectVisible] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<Quiz | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedExportQuizId, setSelectedExportQuizId] = useState('');
  const [selectedExportQuizTitle, setSelectedExportQuizTitle] = useState('');
  const { exportQuiz, isLoading: isExporting, error: exportError } = useExportQuiz();

  useFocusEffect(
    useCallback(() => {
      loadQuizzes();
    }, [])
  );

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredQuizzes(quizzes);
    } else {
      const filtered = quizzes.filter(quiz =>
        quiz.title.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredQuizzes(filtered);
    }
  }, [searchText, quizzes]);

  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      const response = await api.getQuizzes();
      if (response && response.success) {
        setQuizzes(response.data || []);
        setFilteredQuizzes(response.data || []);
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
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

  const handleViewQuiz = (quiz: Quiz) => {
    navigation.navigate('QuizReview', {
      quizId: quiz._id || quiz.id || '',
      title: quiz.title,
      mode: 'review',
    });
  };

  const handleDeleteQuiz = async (quiz: Quiz) => {
    Alert.alert(
      'Delete Quiz',
      `Are you sure you want to delete "${quiz.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await api.deleteQuiz(quiz._id || quiz.id || '');
              setQuizzes(quizzes.filter(q => (q._id || q.id) !== (quiz._id || quiz.id)));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete quiz');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleQuizOptions = (quiz: Quiz) => {
    setSelectedMenuItem(quiz);
  };

  const handleExportQuiz = (quizId: string, quizTitle: string) => {
    setSelectedExportQuizId(quizId);
    setSelectedExportQuizTitle(quizTitle);
    setExportModalVisible(true);
  };

  const handleNewQuiz = (noteId: string, noteTitle: string) => {
    navigation.navigate('Quiz', {
      noteId,
      noteTitle,
    });
  };

  const renderQuizRow = ({ item }: { item: Quiz }) => (
    <View>
      <TouchableOpacity
        style={styles.quizRow}
        onPress={() => handleViewQuiz(item)}
        activeOpacity={0.7}
      >
        <View style={styles.quizIconContainer}>
          <Text style={styles.quizIcon}>{item.totalQuestions}</Text>
          <Text style={styles.quizIconLabel}>Q</Text>
        </View>
        <View style={styles.quizInfo}>
          <Text style={styles.quizTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.quizMeta}>
            <Text style={styles.quizDate}>{formatDate(item.createdAt)}</Text>
            {item.correctAnswers !== undefined && item.correctAnswers > 0 && (
              <Text style={styles.quizScore}>
                {item.correctAnswers}/{item.totalQuestions} correct
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleQuizOptions(item)}
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
        <Text style={styles.headerTitle}>Practice Tests</Text>
        <TouchableOpacity
          style={styles.newQuizButton}
          onPress={() => setNoteSelectVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.newQuizButtonText}>+ New Quiz</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <SearchIcon size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search quizzes..."
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
      ) : filteredQuizzes.length === 0 ? (
        <View style={styles.emptyState}>
          <EmptyFolderLargeIcon size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No quizzes yet</Text>
          <Text style={styles.emptyDescription}>
            Create a quiz from a note to get started
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setNoteSelectVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>+ Create Quiz</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredQuizzes}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={renderQuizRow}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Note Select Drawer */}
      <NoteSelectDrawer
        visible={noteSelectVisible}
        onClose={() => setNoteSelectVisible(false)}
        purpose="quiz"
        onSelectNote={handleNewQuiz}
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
                  onPress={() => { if (selectedMenuItem) { handleViewQuiz(selectedMenuItem); setSelectedMenuItem(null); } }}>
                  <Text style={styles.menuModalOptionText}>👁️  View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuModalOption}
                  onPress={() => { if (selectedMenuItem) { handleExportQuiz(selectedMenuItem._id || selectedMenuItem.id || '', selectedMenuItem.title); setSelectedMenuItem(null); } }}>
                  <Text style={styles.menuModalOptionText}>📤  Export</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuModalOption, styles.menuModalOptionDelete]}
                  onPress={() => { if (selectedMenuItem) { handleDeleteQuiz(selectedMenuItem); setSelectedMenuItem(null); } }}>
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
          if (selectedExportQuizId) {
            await exportQuiz(selectedExportQuizId, selectedExportQuizTitle, format, includeAnswers, true);
            setExportModalVisible(false);
          }
        }}
        title={selectedExportQuizTitle}
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
  newQuizButton: {
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 8,
  },
  newQuizButtonText: {
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
  quizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  quizIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  quizIcon: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: '#3B82F6',
    lineHeight: 20,
  },
  quizIconLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
    color: '#3B82F6',
    marginTop: -4,
  },
  quizInfo: {
    flex: 1,
  },
  quizTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  quizMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  quizDate: {
    fontSize: typography.fontSize.xs,
    color: '#757575',
  },
  quizScore: {
    fontSize: typography.fontSize.xs,
    color: '#10B981',
    fontWeight: typography.fontWeight.semibold,
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
