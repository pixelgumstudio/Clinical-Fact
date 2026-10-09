import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, typography } from '@clinicalfact/design-system';

interface HistoryItemActionSheetProps {
  visible: boolean;
  onView: () => void;
  onExport: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

/** The view/export/delete bottom sheet shared by QuizHistoryList and
 *  FlashcardHistoryList's per-row "•••" menu. */
export const HistoryItemActionSheet: React.FC<HistoryItemActionSheetProps> = ({
  visible,
  onView,
  onExport,
  onDelete,
  onCancel,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onCancel}
  >
    <TouchableWithoutFeedback onPress={onCancel}>
      <View style={styles.menuModalOverlay}>
        <TouchableWithoutFeedback>
          <View style={styles.menuModalContainer}>
            <View style={styles.menuHandleBar} />
            <TouchableOpacity style={styles.menuModalOption} onPress={onView}>
              <Text style={styles.menuModalOptionText}>👁️ View</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuModalOption} onPress={onExport}>
              <Text style={styles.menuModalOptionText}>📤 Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuModalOption, styles.menuModalOptionDelete]}
              onPress={onDelete}
            >
              <Text style={styles.menuModalOptionTextDelete}>🗑️ Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuModalCancel} onPress={onCancel}>
              <Text style={styles.menuModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

const styles = StyleSheet.create({
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
    color: colors.vivid.error[500],
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
