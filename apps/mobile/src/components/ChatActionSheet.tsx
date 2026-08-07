import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { colors, spacing, typography } from '@clinicalfact/design-system';

interface ChatActionSheetProps {
  visible: boolean;
  chatTitle: string;
  isPinned: boolean;
  onClose: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

/** Long-press context menu for a chat row — text-only, no icons, matching the plain
 *  iOS-style action sheet convention (stacked rows separated by hairlines) instead of
 *  a persistent icon button cluttering every row. */
export const ChatActionSheet: React.FC<ChatActionSheetProps> = ({
  visible,
  chatTitle,
  isPinned,
  onClose,
  onDelete,
  onTogglePin,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <Text style={styles.chatTitle} numberOfLines={1}>{chatTitle}</Text>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={onTogglePin} activeOpacity={0.6}>
                <Text style={styles.pinText}>{isPinned ? 'Unpin chat' : 'Pin chat'}</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={onDelete} activeOpacity={0.6}>
                <Text style={styles.deleteText}>Delete chat</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={onClose} activeOpacity={0.6}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  sheet: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chatTitle: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
  },
  row: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  pinText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  deleteText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#EF4444',
  },
  cancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
});
