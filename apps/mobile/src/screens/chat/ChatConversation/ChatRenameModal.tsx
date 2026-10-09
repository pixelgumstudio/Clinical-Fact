import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@clinicalfact/design-system';

interface ChatRenameModalProps {
  visible: boolean;
  value: string;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const ChatRenameModal: React.FC<ChatRenameModalProps> = ({
  visible,
  value,
  onChangeValue,
  onClose,
  onSave,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity style={styles.renameModal} activeOpacity={1}>
        <Text style={styles.renameTitle}>Rename Chat</Text>
        <TextInput
          style={styles.renameInput}
          value={value}
          onChangeText={onChangeValue}
          autoFocus
          selectTextOnFocus
          maxLength={100}
          returnKeyType="done"
          onSubmitEditing={onSave}
        />
        <View style={styles.renameButtons}>
          <TouchableOpacity style={styles.renameCancelButton} onPress={onClose}>
            <Text style={styles.renameCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.renameSaveButton} onPress={onSave}>
            <Text style={styles.renameSaveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  renameModal: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing[5],
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  renameTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  renameInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.border.main,
    marginBottom: spacing[4],
  },
  renameButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  renameCancelButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  renameCancelText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  renameSaveButton: {
    backgroundColor: colors.vivid.accent[500],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: 10,
  },
  renameSaveText: {
    fontSize: typography.fontSize.base,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
});
