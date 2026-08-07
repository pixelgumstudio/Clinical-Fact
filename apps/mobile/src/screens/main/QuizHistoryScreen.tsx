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
  Icon,
  theme,
} from '@clinicalfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';
import { CreateFromSourceSheet } from '../../components/CreateFromSourceSheet';

type QuizHistoryNavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface QuizGroup {
  groupKey: string;
  sourceType: 'note' | 'chat' | 'standalone';
  noteId?: string;
  chatSessionId?: string;
  quizId?: string;
  title: string;
  sourceTitle: string;
  createdAt: string;
  totalQuestions: number;
  lastScore?: { correct: number; total: number };
  bestScore?: { correct: number; total: number };
  attempts: number;
}

export const QuizHistoryScreen: React.FC = () => {
  const navigation = useNavigation<QuizHistoryNavigationProp>();
  const [groups, setGroups] = useState<QuizGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<QuizGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<QuizGroup | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredGroups(groups);
    } else {
      const filtered = groups.filter(group =>
        group.sourceTitle.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredGroups(filtered);
    }
  }, [searchText, groups]);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const response = await api.getQuizGroups();
      if (response && response.success) {
        setGroups(response.data || []);
        setFilteredGroups(response.data || []);
      }
    } catch (error) {
      console.error('Error loading quiz groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleOpenGroup = (group: QuizGroup) => {
    if (group.sourceType === 'standalone') {
      // No note/chat behind it — nothing to group, go straight to the single attempt.
      navigation.navigate('QuizReview', {
        quizId: group.quizId || '',
        title: group.title,
        mode: 'review',
      });
      return;
    }
    navigation.navigate('QuizGroupDetail', {
      noteId: group.noteId,
      chatSessionId: group.chatSessionId,
      title: group.sourceTitle,
    });
  };

  const handleDeleteGroup = async (group: QuizGroup) => {
    Alert.alert(
      'Delete Quiz',
      `Are you sure you want to delete "${group.sourceTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const response = group.sourceType === 'standalone'
                ? null
                : await api.getQuizGroupDetail({ noteId: group.noteId, chatSessionId: group.chatSessionId });
              const quizIds = response?.success && response.data
                ? response.data.attempts.map((a: any) => a.quizId)
                : [group.quizId || ''];
              await Promise.all(quizIds.map((id: string) => api.deleteQuiz(id)));
              setGroups(groups.filter(g => g.groupKey !== group.groupKey));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete quiz');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleQuizOptions = (group: QuizGroup) => {
    setSelectedMenuItem(group);
  };

  const renderQuizRow = ({ item }: { item: QuizGroup }) => (
    <View>
      <TouchableOpacity
        style={styles.quizRow}
        onPress={() => handleOpenGroup(item)}
        activeOpacity={0.7}
      >
        <View style={styles.quizIconContainer}>
          <Icon name="quizFill" size={20} color={theme.colors.yale[700]} />
        </View>
        <View style={styles.quizInfo}>
          <Text style={styles.quizTitle} numberOfLines={1}>
            {item.sourceTitle}
          </Text>
          <View style={styles.quizMeta}>
            <Text style={styles.quizDate}>{formatDate(item.createdAt)}</Text>
            {item.lastScore && (
              <Text style={styles.quizScore}>
                {item.lastScore.correct}/{item.lastScore.total} correct
              </Text>
            )}
            {item.attempts > 1 && (
              <Text style={styles.quizAttempts}>{item.attempts} attempts</Text>
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
        <Text style={styles.headerTitle}>Quiz</Text>
        <TouchableOpacity
          style={styles.newQuizButton}
          onPress={() => setCreateSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.newQuizButtonText}>Create Quiz</Text>
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
      ) : filteredGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <EmptyFolderLargeIcon size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No quizzes yet</Text>
          <Text style={styles.emptyDescription}>
            Create a quiz from a note to get started
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setCreateSheetVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>+ Create Quiz</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.groupKey || item.quizId || Math.random().toString()}
          renderItem={({ item }) => renderQuizRow({ item })}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Quiz From Sheet */}
      <CreateFromSourceSheet
        visible={createSheetVisible}
        onClose={() => setCreateSheetVisible(false)}
        mode="quiz"
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
                <View style={styles.menuHeaderRow}>
                  <Text style={styles.menuHeaderTitle}>Quiz options</Text>
                  <TouchableOpacity onPress={() => setSelectedMenuItem(null)} style={styles.menuCloseButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="close" size={20} color={theme.colors.grey[600]} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.menuModalOption} activeOpacity={0.7}
                  onPress={() => { if (selectedMenuItem) { handleOpenGroup(selectedMenuItem); setSelectedMenuItem(null); } }}>
                  <Icon name="note" size={24} color={theme.colors.yale[700]} />
                  <Text style={styles.menuModalOptionText}>View</Text>
                  <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuModalOption} activeOpacity={0.7}
                  onPress={() => { if (selectedMenuItem) { handleDeleteGroup(selectedMenuItem); setSelectedMenuItem(null); } }}>
                  <Icon name="delete" size={24} color={theme.colors.yale[700]} />
                  <Text style={styles.menuModalOptionText}>Delete</Text>
                  <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  headerTitle: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
  },
  newQuizButton: {
    backgroundColor: theme.colors.yale[700],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
  },
  newQuizButtonText: {
    ...theme.typography.textStyles.button2,
    color: theme.colors.white,
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
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  quizInfo: {
    flex: 1,
  },
  quizTitle: {
    ...theme.typography.textStyles.title1,
    color: theme.colors.grey[900],
    marginBottom: 2,
  },
  quizMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  quizDate: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[500],
  },
  quizScore: {
    fontSize: typography.fontSize.xs,
    color: '#10B981',
    fontWeight: typography.fontWeight.semibold,
  },
  quizAttempts: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
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
    backgroundColor: theme.colors.yale[700],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: theme.borderRadius.full,
  },
  createButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 22, 39, 0.35)',
    justifyContent: 'flex-end',
  },
  menuModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius['3xl'],
    borderTopRightRadius: theme.borderRadius['3xl'],
    paddingTop: theme.spacing[3],
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[8],
  },
  menuHandleBar: {
    width: 60,
    height: 8,
    backgroundColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.full,
    alignSelf: 'center',
    marginBottom: theme.spacing[5],
  },
  menuHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  menuHeaderTitle: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
  },
  menuCloseButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  menuModalOptionText: {
    flex: 1,
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
});
