import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  SearchIcon,
  EmptyFolderLargeIcon,
} from '@clinicfact/design-system';
import api from '../services/api';
import { CreateNoteModal } from './CreateNoteModal';

interface NoteSelectDrawerProps {
  visible: boolean;
  onClose: () => void;
  purpose: 'quiz' | 'flashcard';
  onSelectNote: (noteId: string, noteTitle: string) => void;
}

interface Note {
  _id: string;
  id?: string;
  title: string;
  createdAt: string;
  sourceType?: string;
}

export const NoteSelectDrawer: React.FC<NoteSelectDrawerProps> = ({
  visible,
  onClose,
  purpose,
  onSelectNote,
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNotes();
    }
  }, [visible]);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredNotes(notes);
    } else {
      const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredNotes(filtered);
    }
  }, [searchText, notes]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const response = await api.getNotes({ limit: 100 });
      if (response.success && response.data) {
        setNotes(response.data.notes);
        setFilteredNotes(response.data.notes);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
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

  const getSourceIcon = (sourceType?: string) => {
    switch (sourceType) {
      case 'audio':
      case 'record_audio':
      case 'upload_audio':
        return '🎵';
      case 'pdf':
      case 'pdf_document':
        return '📄';
      case 'youtube':
        return '▶️';
      case 'image':
        return '🖼️';
      case 'video':
        return '🎬';
      default:
        return '📝';
    }
  };

  const handleNoteSelect = (note: Note) => {
    onSelectNote(note._id, note.title);
    setSearchText('');
    onClose();
  };

  const handleCreateNote = () => {
    setCreateModalVisible(true);
  };

  const handleCreateModalClose = () => {
    setCreateModalVisible(false);
  };

  const handleSelectCreateOption = (optionType: string) => {
    handleCreateModalClose();
    // Close the drawer as well
    onClose();
    // The CreateNoteModal will handle navigation
  };

  const title = purpose === 'quiz' ? 'Select note for quiz' : 'Select note for flashcards';

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.container}>
                <View style={styles.handleBar} />

                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>{title}</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <View style={styles.searchInputWrapper}>
                    <SearchIcon size={20} color="#999" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search notes..."
                      placeholderTextColor="#BFBFBF"
                      value={searchText}
                      onChangeText={setSearchText}
                    />
                  </View>
                </View>

                {/* Notes List */}
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary[500]} />
                  </View>
                ) : filteredNotes.length === 0 ? (
                  <View style={styles.emptyState}>
                    <EmptyFolderLargeIcon size={80} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No notes yet</Text>
                    <Text style={styles.emptyDescription}>
                      Create a note first to generate {purpose === 'quiz' ? 'quizzes' : 'flashcards'}
                    </Text>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={handleCreateNote}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.createButtonText}>+ Create Note</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={filteredNotes}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.noteRow}
                        onPress={() => handleNoteSelect(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.noteIconContainer}>
                          <Text style={styles.noteIcon}>{getSourceIcon(item.sourceType)}</Text>
                        </View>
                        <View style={styles.noteInfo}>
                          <Text style={styles.noteTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    scrollEnabled={true}
                    contentContainerStyle={styles.listContent}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <CreateNoteModal
        visible={isCreateModalVisible}
        onClose={handleCreateModalClose}
        onSelectOption={handleSelectCreateOption}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: spacing[8],
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[3],
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
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
    flexGrow: 1,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  noteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  noteIcon: {
    fontSize: 20,
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  noteDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginLeft: spacing[12],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
