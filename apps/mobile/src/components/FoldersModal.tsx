import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  CloseIcon,
  PlusIcon,
  FolderIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@clinicalfact/design-system';
import { Folder } from '../store/folderStore';
import { useFolders, useAddFolder } from '../hooks/queries';
export type { Folder } from '../store/folderStore';

interface FoldersModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectFolder: (folderId: string | null) => void;
  onFolderCreated?: () => void;
  folders?: Folder[];
  selectedFolderId?: string;
  folderType?: 'note' | 'chat';
}

// Export FOLDER_COLORS for use in AddFolderModal
export const FOLDER_COLORS: Record<string, string> = colors.folderTagPalette;

export const FoldersModal: React.FC<FoldersModalProps> = ({
  visible,
  onClose,
  onSelectFolder,
  onFolderCreated,
  folders: propFolders,
  selectedFolderId,
  folderType = 'note',
}) => {
  const addFolderMutation = useAddFolder();
  const { data: queryFolders = [] } = useFolders(folderType);
  // Use folders from props if provided (parent manages via API), else fall back to React Query cache
  const folders = propFolders && propFolders.length > 0 ? propFolders : queryFolders;
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [folderName, setFolderName] = useState('');

  const folderColors = Object.values(FOLDER_COLORS);

  const handleAddFolder = async () => {
    if (folderName.trim()) {
      const randomColor = folderColors[Math.floor(Math.random() * folderColors.length)];
      await addFolderMutation.mutateAsync({ name: folderName.trim(), color: randomColor, folderType });
      setFolderName('');
      setShowAddFolder(false);
      onFolderCreated?.();
    }
  };

  const handleSelectFolder = (folderId: string | null) => {
    onSelectFolder(folderId);
    setShowAddFolder(false);
    setFolderName('');
  };

  const totalItems = folders.reduce((sum, folder) => sum + ((folder as any).itemCount || 0), 0);

  const renderFolderItem = ({ item }: { item: Folder }) => {
    const itemId = item._id || item.id || '';
    const isSelected = selectedFolderId === itemId;
    return (
      <TouchableOpacity
        style={styles.folderItem}
        onPress={() => handleSelectFolder(itemId)}
        activeOpacity={0.7}
      >
        <View style={[styles.folderIconContainer, { backgroundColor: item.color }]}>
          <FolderIcon size={26} color={colors.white} />
        </View>
        <View style={styles.folderContent}>
          <Text style={styles.folderName}>{item.name}</Text>
          <Text style={styles.folderCount}>{(item as any).itemCount || 0} items</Text>
        </View>
        {isSelected ? (
          <CheckIcon size={20} color={colors.vivid.success[500]} />
        ) : (
          <ChevronRightIcon size={20} color={colors.slate[400]} />
        )}
      </TouchableOpacity>
    );
  };

  if (showAddFolder) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={styles.addFolderContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowAddFolder(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.addFolderContent}>
              <View style={styles.folderIconLarge}>
                <FolderIcon size={64} color={colors.vivid.accent[500]} />
              </View>

              <Text style={styles.addFolderTitle}>Enter your folder name</Text>

              <TextInput
                style={styles.folderInput}
                placeholder="Your folder name"
                placeholderTextColor={colors.slate[400]}
                value={folderName}
                onChangeText={setFolderName}
                autoFocus
              />

              <TouchableOpacity
                style={[
                  styles.createButton,
                  !folderName.trim() && styles.createButtonDisabled,
                ]}
                onPress={handleAddFolder}
                disabled={!folderName.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.createButtonText}>Create folder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseIcon size={24} color={colors.slate[500]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Folders</Text>
                <TouchableOpacity
                  style={styles.addFolderButton}
                  onPress={() => setShowAddFolder(true)}
                >
                  <PlusIcon size={14} color={colors.white} />
                  <Text style={styles.addFolderButtonText}>Add folder</Text>
                </TouchableOpacity>
              </View>

              {/* Content */}
              {folders.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyFolderIcon}>
                    <FolderIcon size={36} color={colors.slate[300]} />
                  </View>
                  <Text style={styles.emptyTitle}>No folders to display</Text>
                  <Text style={styles.emptyDescription}>
                    Click the button above to create a folder{'\n'}for your notes
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddButton}
                    onPress={() => setShowAddFolder(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyAddButtonText}>Add folder</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.folderItem}
                    onPress={() => handleSelectFolder(null)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.folderIconContainer, { backgroundColor: colors.folderTagPalette.orange }]}>
                      <FolderIcon size={26} color={colors.white} />
                    </View>
                    <View style={styles.folderContent}>
                      <Text style={styles.folderName}>All folders</Text>
                      <Text style={styles.folderCount}>{totalItems} items</Text>
                    </View>
                    <ChevronRightIcon size={20} color={colors.slate[400]} />
                  </TouchableOpacity>

                  <FlatList
                    data={folders}
                    keyExtractor={(item) => item._id || item.id || ''}
                    renderItem={renderFolderItem}
                    style={styles.folderList}
                    contentContainerStyle={styles.folderListContent}
                    showsVerticalScrollIndicator={false}
                  />
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing[8],
    maxHeight: '80%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  closeButton: {
    padding: spacing[1],
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  addFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grey[900],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 20,
    gap: 4,
  },
  addFolderButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  folderList: {
    maxHeight: 380,
  },
  folderListContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  folderIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  folderContent: {
    flex: 1,
  },
  folderName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  folderCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
  },
  emptyFolderIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  emptyAddButton: {
    backgroundColor: colors.grey[900],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[3],
    borderRadius: 24,
  },
  emptyAddButtonText: {
    color: colors.neutral[0],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  addFolderContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backButton: {
    position: 'absolute',
    top: spacing[12],
    left: spacing[5],
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 36,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.light,
  },
  addFolderContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  folderIconLarge: {
    width: 140,
    height: 140,
    borderRadius: 28,
    backgroundColor: colors.folderAccentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  addFolderTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  folderInput: {
    width: '100%',
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginBottom: spacing[8],
  },
  createButton: {
    width: '100%',
    backgroundColor: colors.grey[900],
    borderRadius: 24,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  createButtonText: {
    color: colors.neutral[0],
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
