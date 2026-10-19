import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  DeleteLargeIcon,
} from '@clinicalfact/design-system';
import { useTranslation } from 'react-i18next';

interface DeleteNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export const DeleteNoteModal: React.FC<DeleteNoteModalProps> = ({
  visible,
  onClose,
  onConfirmDelete,
}) => {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Icon */}
              <View style={styles.iconContainer}>
                <DeleteLargeIcon size={64} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{t('components.deleteNote.deleteNote')}</Text>

              {/* Description */}
              <Text style={styles.description}>
               {t('components.deleteNote.areYouSureYouWantTo')}
              </Text>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={onConfirmDelete}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteButtonText}>{t('components.deleteNote.deleteNote')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
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
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[6],
  },
  iconContainer: {
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: spacing[5],
  },
  deleteButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  deleteButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
  cancelButton: {
    backgroundColor: colors.neutral[200],
    paddingVertical: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
});
