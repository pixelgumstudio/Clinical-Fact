import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  colors,
  spacing,
  typography,
  ChevronLeftIcon,
  AudioIcon,
  VideoIcon,
  TextIcon,
  ImageIcon,
  DocumentIcon,
  MicrophoneIcon,
  CloseIcon,
} from '@clinicalfact/design-system';
import { useFolders, useNotes, useInvalidateNotes } from '../../hooks/queries';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import api from '../../services/api';

type FolderDetailRouteProp = RouteProp<MainStackParamList, 'FolderDetail'>;
type FolderDetailNavigationProp = NativeStackNavigationProp<MainStackParamList, 'FolderDetail'>;

const getNoteIcon = (type: string) => {
  switch (type) {
    case 'audio':
      return <AudioIcon size={20} color="#6B7280" />;
    case 'video':
      return <VideoIcon size={20} color="#6B7280" />;
    case 'text':
      return <TextIcon size={20} color="#6B7280" />;
    case 'image':
      return <ImageIcon size={20} color="#6B7280" />;
    case 'document':
      return <DocumentIcon size={20} color="#6B7280" />;
    case 'transcript':
      return <MicrophoneIcon size={20} color="#6B7280" />;
    default:
      return <DocumentIcon size={20} color="#6B7280" />;
  }
};

interface NoteItemProps {
  note: any;
  onPress: () => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ note, onPress }) => (
  <TouchableOpacity
    style={styles.noteItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.noteIconContainer}>
      {getNoteIcon(note.sourceType || note.type)}
    </View>
    <View style={styles.noteContent}>
      <Text style={styles.noteTitle} numberOfLines={1}>
        {note.title}
      </Text>
      <Text style={styles.noteDate}>
        Created {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </Text>
    </View>
  </TouchableOpacity>
);

export const FolderDetailScreen = () => {
  const navigation = useNavigation<FolderDetailNavigationProp>();
  const route = useRoute<FolderDetailRouteProp>();
  const { folderId } = route.params;

  const { data: folders = [] } = useFolders('note');
  const invalidateNotes = useInvalidateNotes();
  const folder = folders.find((f) => f._id === folderId || f.id === folderId);

  const {
    data: notes = [],
    isLoading,
  } = useNotes({ folderId });
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [allNotes, setAllNotes] = useState<any[]>([]);
  const [isPickerLoading, setPickerLoading] = useState(false);

  const handleNotePress = (note: any) => {
    navigation.navigate('NoteDetail', {
      noteId: note._id || note.id,
      title: note.title,
    });
  };

  const handleAddNote = async () => {
    setPickerLoading(true);
    setPickerVisible(true);
    try {
      const response = await api.getNotes();
      if (response.success && response.data) {
        // Exclude notes already in this folder
        const folderNoteIds = new Set(notes.map((n) => n._id || n.id));
        const available = (response.data.notes || []).filter(
          (n: any) => !folderNoteIds.has(n._id || n.id)
        );
        setAllNotes(available);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setPickerLoading(false);
    }
  };

  const handlePickNote = async (note: any) => {
    const noteId = note._id || note.id;
    try {
      const response = await api.moveNoteToFolder(noteId, folderId);
      if (response.success) {
        setPickerVisible(false);
        invalidateNotes(); // bust cache so all screens reflect the move
      } else {
        Alert.alert('Error', response.message || 'Failed to add note to folder');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add note to folder');
    }
  };

  if (!folder) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeftIcon size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Folder not found</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {folder.name}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddNote}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ Add note</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#1C1C1C" />
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No notes in this folder</Text>
          <Text style={styles.emptyDescription}>
            Move notes to this folder to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item._id || item.id}
          renderItem={({ item }) => (
            <NoteItem note={item} onPress={() => handleNotePress(item)} />
          )}
          contentContainerStyle={styles.notesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Note Picker Modal */}
      <Modal
        visible={isPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPickerVisible(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHandleBar} />
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Add note to folder</Text>
                  <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <CloseIcon size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {isPickerLoading ? (
                  <View style={styles.pickerEmpty}>
                    <ActivityIndicator size="large" color="#1C1C1C" />
                  </View>
                ) : allNotes.length === 0 ? (
                  <View style={styles.pickerEmpty}>
                    <Text style={styles.pickerEmptyText}>No notes available to add</Text>
                    <Text style={styles.pickerEmptySubtext}>All your notes are already in this folder</Text>
                  </View>
                ) : (
                  <FlatList
                    data={allNotes}
                    keyExtractor={(item) => item._id || item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.pickerNoteItem}
                        onPress={() => handlePickNote(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.noteIconContainer}>
                          {getNoteIcon(item.sourceType || item.type)}
                        </View>
                        <View style={styles.noteContent}>
                          <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.noteDate}>
                            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    style={styles.pickerList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
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
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing[2],
    marginLeft: -spacing[2],
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginHorizontal: spacing[3],
  },
  addButton: {
    backgroundColor: '#1C1C1C',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 20,
  },
  addButtonText: {
    color: colors.neutral[0],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  placeholder: {
    width: 80,
  },
  notesList: {
    paddingHorizontal: spacing[5],
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  noteIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  noteDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: spacing[8],
  },
  pickerHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  pickerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
  },
  pickerEmptyText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  pickerEmptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerNoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
});
