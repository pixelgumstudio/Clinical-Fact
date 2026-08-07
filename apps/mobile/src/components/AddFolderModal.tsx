import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  CloseIcon,
  FolderColorIcon,
} from '@clinicalfact/design-system';
import { FOLDER_COLORS } from './FoldersModal';

interface AddFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, color: string) => void;
}

const colorOptions = Object.entries(FOLDER_COLORS).map(([key, value]) => ({
  key,
  value,
}));

export const AddFolderModal: React.FC<AddFolderModalProps> = ({
  visible,
  onClose,
  onCreateFolder,
}) => {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS.green);

  const handleCreate = () => {
    if (folderName.trim()) {
      onCreateFolder(folderName.trim(), selectedColor);
      setFolderName('');
      setSelectedColor(FOLDER_COLORS.green);
      onClose();
    }
  };

  const handleClose = () => {
    setFolderName('');
    setSelectedColor(FOLDER_COLORS.green);
    onClose();
  };

  const isCreateDisabled = !folderName.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseIcon size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add folder</Text>
                <View style={styles.headerSpacer} />
              </View>

              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
              >
                {/* Folder Preview */}
                <View style={styles.previewSection}>
                  <FolderColorIcon size={80} folderColor={selectedColor} />
                </View>

                {/* Folder Name Input */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Folder name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter folder name"
                    placeholderTextColor={colors.text.tertiary}
                    value={folderName}
                    onChangeText={setFolderName}
                    autoCapitalize="words"
                  />
                </View>

                {/* Color Selection */}
                <View style={styles.colorSection}>
                  <Text style={styles.inputLabel}>Choose color</Text>
                  <View style={styles.colorGrid}>
                    {colorOptions.map((color) => (
                      <TouchableOpacity
                        key={color.key}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color.value },
                          selectedColor === color.value && styles.colorOptionSelected,
                        ]}
                        onPress={() => setSelectedColor(color.value)}
                        activeOpacity={0.7}
                      >
                        {selectedColor === color.value && (
                          <View style={styles.colorCheckmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Create Button */}
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    isCreateDisabled && styles.createButtonDisabled,
                  ]}
                  onPress={handleCreate}
                  disabled={isCreateDisabled}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.createButtonText,
                      isCreateDisabled && styles.createButtonTextDisabled,
                    ]}
                  >
                    Create folder
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
    maxHeight: '85%',
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
  headerSpacer: {
    width: 32,
  },
  content: {
    paddingHorizontal: spacing[5],
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  inputSection: {
    marginBottom: spacing[5],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  colorSection: {
    marginBottom: spacing[6],
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  createButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  createButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  createButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  createButtonTextDisabled: {
    color: colors.neutral[500],
  },
});
