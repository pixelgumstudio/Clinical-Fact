import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  colors,
  spacing,
  typography,
  SearchIcon,
  FolderIcon,
  DocumentFileIcon,
  FilterIcon,
  CloseIcon,
  AudioFilePreviewIcon,
  NoteFilePreviewIcon,
  ImageIcon,
  YoutubeIcon,
  CheckIcon,
  PlusIcon,
  ChevronRightIcon,
} from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { useNotesPaginated, useFolders, useDeleteNote } from '../../hooks/queries';
import api from '../../services/api';
import { NoteOptionsModal } from '../../components/NoteOptionsModal';
import { DeleteNoteModal } from '../../components/DeleteNoteModal';
import { FoldersModal } from '../../components/FoldersModal';
import { useQueryClient } from '@tanstack/react-query';

type LibraryNavigationProp = NativeStackNavigationProp<MainStackParamList>;

type NoteCardType = 'audio' | 'text' | 'pdf' | 'video' | 'image' | 'youtube';

const mapSourceType = (sourceType: string): NoteCardType => {
  switch (sourceType) {
    case 'audio':
    case 'upload_audio':
    case 'record_audio':
      return 'audio';
    case 'youtube':
      return 'youtube';
    case 'pdf':
    case 'pdf_document':
    case 'document':
      return 'pdf';
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    default:
      return 'text';
  }
};

const formatNoteDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${month} ${day}, ${year}  ${hours}:${minutes}${ampm}`;
};

const NoteTypeIcon = ({ type, size = 18 }: { type: NoteCardType; size?: number }) => {
  const color = '#8B8B8B';
  switch (type) {
    case 'audio':
      return <AudioFilePreviewIcon size={size} color={color} />;
    case 'pdf':
      return <DocumentFileIcon size={size} color={color} />;
    case 'image':
      return <ImageIcon size={size} color={color} />;
    case 'youtube':
    case 'video':
      return <YoutubeIcon size={size} color={color} />;
    default:
      return <NoteFilePreviewIcon size={size} color={color} />;
  }
};

export const LibraryScreen = () => {
  const navigation = useNavigation<LibraryNavigationProp>();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [foldersVisible, setFoldersVisible] = useState(false);
  const [addFolderVisible, setAddFolderVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterType, setFilterType] = useState<NoteCardType | null>(null);

  const {
    notes,
    isLoading,
    isLoadingMore,
    hasMore,
    totalCount,
    loadMore,
    refresh: refreshNotes,
  } = useNotesPaginated({ folderId: selectedFolderId ?? undefined });
  const { data: folders = [] } = useFolders('note');
  const deleteNoteMutation = useDeleteNote();

  // Protect the "All Notes" total so it never briefly shows a folder count.
  // prevFolderIdRef detects the single transition render where selectedFolderId has
  // already become null but the effect hasn't fired yet, leaving totalCount stale.
  const allNotesTotalRef = useRef(0);
  const prevFolderIdRef = useRef<string | null>(selectedFolderId);
  const folderJustCleared = prevFolderIdRef.current !== null && selectedFolderId === null;
  prevFolderIdRef.current = selectedFolderId;

  if (!selectedFolderId && !folderJustCleared && !isLoading && totalCount > 0) {
    allNotesTotalRef.current = totalCount;
  }
  const allNotesTotal = allNotesTotalRef.current;

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
  };

  const handleNotePress = (note: any) => {
    navigation.navigate('NoteDetail', {
      noteId: note._id,
      title: note.title,
    });
  };

  const handleMore = (note: any) => {
    setActiveNote(note);
    setOptionsVisible(true);
  };

  const handleDeleteNote = () => {
    setOptionsVisible(false);
    setDeleteVisible(true);
  };

  const handleConfirmDelete = () => {
    setDeleteVisible(false);
    deleteNoteMutation.mutate(activeNote._id, {
      onSuccess: () => refreshNotes(),
      onError: (err: any) => {
        const message =
          err?.message === 'OFFLINE_ACTION_BLOCKED'
            ? 'You are currently offline. Please connect to the internet to perform this action.'
            : err?.message || 'Failed to delete note';
        Alert.alert('Error', message);
      },
    });
  };

  const handleMoveToFolder = () => {
    setOptionsVisible(false);
    setFoldersVisible(true);
  };

  const handleSelectFolder = async (folderId: string | null) => {
    setFoldersVisible(false);
    try {
      const response = await api.moveNoteToFolder(activeNote._id, folderId);
      if (response.success) {
        await qc.invalidateQueries({ queryKey: ['notes'] });
        await qc.invalidateQueries({ queryKey: ['folders'] });
      } else {
        Alert.alert('Error', response.message || 'Failed to move note');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to move note');
    }
  };

  const handleDeleteFolder = (folder: any) => {
    Alert.alert(
      'Delete Folder?',
      'Are you sure? Notes inside will not be deleted, just moved to All Notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteFolder(folder._id);
              if (response.success) {
                if (selectedFolderId === folder._id) setSelectedFolderId(null);
                await qc.invalidateQueries({ queryKey: ['folders'] });
              } else {
                Alert.alert('Error', response.message || 'Failed to delete folder');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete folder');
            }
          },
        },
      ]
    );
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || mapSourceType(note.sourceType || 'text') === filterType;
    return matchesSearch && matchesType;
  });

  const selectedFolder = folders.find(f => f._id === selectedFolderId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <TouchableOpacity
          style={styles.addFolderPill}
          onPress={() => setAddFolderVisible(true)}
          activeOpacity={0.8}
        >
          <PlusIcon size={12} color="#FFFFFF" />
          <Text style={styles.addFolderPillText}>Add folder</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar with inline filter button */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon size={18} color="#A6A6A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a note / folder"
            placeholderTextColor="#A6A6A6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={[styles.filterIconButton, filterType ? styles.filterIconButtonActive : null]}
            onPress={() => setFilterVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FilterIcon size={16} color={filterType ? '#FFFFFF' : '#8B8B8B'} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        style={styles.flatList}
        data={filteredNotes}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View>
            {/* Your Folders Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Folders</Text>
              </View>

              {folders.length === 0 ? (
                <View style={styles.emptyFolders}>
                  <View style={styles.emptyIcon}>
                    <FolderIcon size={36} color="#D1D5DB" />
                  </View>
                  <Text style={styles.emptyTitle}>No folders to display</Text>
                  <Text style={styles.emptySubtext}>
                    Tap "+ Add folder" to create a folder for your notes
                  </Text>
                </View>
              ) : (
                <View>
                  {/* All Notes — always shown at top, clears folder filter */}
                  <TouchableOpacity
                    style={[styles.folderCard, selectedFolderId === null ? styles.folderCardSelected : null]}
                    onPress={() => handleFolderSelect(null)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.folderIconContainer, { backgroundColor: '#E5E7EB' }]}>
                      <DocumentFileIcon size={20} color="#6B7280" />
                    </View>
                    <View style={styles.folderCardContent}>
                      <Text style={styles.folderCardName}>All Notes</Text>
                      <Text style={styles.folderCardCount}>{allNotesTotal} items</Text>
                    </View>
                    <ChevronRightIcon size={18} color="#A6A6A6" />
                  </TouchableOpacity>
                  {folders.map(folder => {
                    const isSelected = selectedFolderId === folder._id;
                    return (
                      <TouchableOpacity
                        key={folder._id}
                        style={[styles.folderCard, isSelected ? styles.folderCardSelected : null]}
                        onPress={() => handleFolderSelect(isSelected ? null : folder._id)}
                        onLongPress={() => handleDeleteFolder(folder)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.folderIconContainer,
                            { backgroundColor: folder.color || '#FFD4A3' },
                          ]}
                        >
                          <FolderIcon size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.folderCardContent}>
                          <Text style={styles.folderCardName}>{folder.name}</Text>
                          <Text style={styles.folderCardCount}>
                            {(folder as any).itemCount ?? 0} items
                          </Text>
                        </View>
                        <ChevronRightIcon size={18} color="#A6A6A6" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Notes section header */}
            <View style={styles.notesSectionHeader}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedFolder ? selectedFolder.name : 'Your notes'}
                </Text>
                {selectedFolderId && (
                  <TouchableOpacity
                    onPress={() => handleFolderSelect(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CloseIcon size={16} color="#8B8B8B" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.noteRow}
            onPress={() => handleNotePress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.noteIconCircle}>
              <NoteTypeIcon type={mapSourceType(item.sourceType || 'text')} size={18} />
            </View>
            <View style={styles.noteRowContent}>
              <Text style={styles.noteRowTitle} numberOfLines={1}>
                {item.title || 'Untitled Note'}
              </Text>
              <Text style={styles.noteRowDate}>
                {formatNoteDate(new Date(item.createdAt))}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleMore(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.noteMoreDots}>···</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.noteDivider} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.neutral[900]} />
            </View>
          ) : (
            <View style={styles.emptyNotes}>
              <View style={styles.emptyIcon}>
                <DocumentFileIcon size={36} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : selectedFolderId
                  ? 'No notes in this folder'
                  : 'No notes to display'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : selectedFolderId
                  ? 'Move notes to this folder to see them here'
                  : 'Click below to generate your note\nwith ClinicFact'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.neutral[500]} />
            </View>
          ) : null
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFilterVisible(false)}>
          <View style={styles.filterOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.filterSheet}>
                <View style={styles.filterHandleBar} />
                <View style={styles.filterHeader}>
                  <Text style={styles.filterTitle}>Filter by type</Text>
                  <TouchableOpacity
                    onPress={() => setFilterVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <CloseIcon size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                {([
                  {
                    type: 'audio' as NoteCardType,
                    label: 'Audio',
                    icon: <AudioFilePreviewIcon size={28} color={colors.primary[500]} />,
                  },
                  {
                    type: 'text' as NoteCardType,
                    label: 'Text',
                    icon: <NoteFilePreviewIcon size={28} color={colors.secondary[500]} />,
                  },
                  {
                    type: 'pdf' as NoteCardType,
                    label: 'PDF',
                    icon: <DocumentFileIcon size={28} color={colors.error.main} />,
                  },
                  {
                    type: 'image' as NoteCardType,
                    label: 'Image',
                    icon: <ImageIcon size={28} color={colors.success.main} />,
                  },
                  {
                    type: 'youtube' as NoteCardType,
                    label: 'YouTube',
                    icon: <YoutubeIcon size={28} color={colors.error.main} />,
                  },
                ] as const).map(({ type, label, icon }) => {
                  const isSelected = filterType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={styles.filterItem}
                      onPress={() => {
                        setFilterType(isSelected ? null : type);
                        setFilterVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.filterItemIcon}>{icon}</View>
                      <Text style={styles.filterItemLabel}>{label}</Text>
                      {isSelected && <CheckIcon size={20} color="#10B981" />}
                    </TouchableOpacity>
                  );
                })}
                {filterType && (
                  <TouchableOpacity
                    style={styles.clearFilterButton}
                    onPress={() => {
                      setFilterType(null);
                      setFilterVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.clearFilterText}>Clear filter</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <NoteOptionsModal
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        onMoveToFolder={handleMoveToFolder}
        onDeleteNote={handleDeleteNote}
      />

      <DeleteNoteModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Move to folder */}
      <FoldersModal
        visible={foldersVisible}
        onClose={() => setFoldersVisible(false)}
        onSelectFolder={handleSelectFolder}
        folders={folders}
        selectedFolderId={activeNote?.folderId}
        folderType="note"
      />

      {/* Add folder — opens existing FoldersModal which has built-in folder creation */}
      <FoldersModal
        visible={addFolderVisible}
        onClose={() => setAddFolderVisible(false)}
        onSelectFolder={() => setAddFolderVisible(false)}
        folders={folders}
        folderType="note"
        onFolderCreated={async () => {
          await qc.invalidateQueries({ queryKey: ['folders'] });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    letterSpacing: -0.48,
    lineHeight: 32,
  },
  searchContainer: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    paddingHorizontal: spacing[4],
    height: 48,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1C',
    letterSpacing: -0.32,
  },
  filterIconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIconButtonActive: {
    backgroundColor: '#1C1C1C',
  },
  flatList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },
  notesSectionHeader: {
    marginBottom: spacing[3],
  },
  footerLoader: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1C',
    letterSpacing: -0.16,
    lineHeight: 22,
  },
  addFolderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 4,
  },
  addFolderPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.12,
    lineHeight: 16,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F9F9F9',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
    minHeight: 64,
    gap: spacing[3],
  },
  folderCardSelected: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  folderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderCardContent: {
    flex: 1,
  },
  folderCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1C',
    letterSpacing: -0.16,
    lineHeight: 22,
    marginBottom: 2,
  },
  folderCardCount: {
    fontSize: 14,
    fontWeight: '400',
    color: '#636363',
    letterSpacing: -0.28,
    lineHeight: 20,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  noteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  noteRowContent: {
    flex: 1,
  },
  noteRowTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#2D2D2D',
    letterSpacing: -0.28,
    lineHeight: 20,
    marginBottom: 2,
  },
  noteRowDate: {
    fontSize: 12,
    fontWeight: '400',
    color: '#757575',
    letterSpacing: -0.24,
    lineHeight: 16,
  },
  noteMoreDots: {
    fontSize: 18,
    color: '#8B8B8B',
    letterSpacing: 1,
    lineHeight: 18,
  },
  noteDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginLeft: 52,
  },
  loadingContainer: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyFolders: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyNotes: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#F3F3F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#484848',
    letterSpacing: -0.16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8B8B8B',
    letterSpacing: -0.28,
    lineHeight: 20,
    textAlign: 'center',
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing[8],
  },
  filterHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  filterTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterItemIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: spacing[3],
  },
  filterItemLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  clearFilterButton: {
    marginHorizontal: spacing[5],
    marginTop: spacing[4],
    backgroundColor: colors.neutral[100],
    paddingVertical: spacing[3],
    borderRadius: 12,
    alignItems: 'center',
  },
  clearFilterText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
});
