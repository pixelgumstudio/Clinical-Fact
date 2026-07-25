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
  CloseIcon,
  DeleteIcon,
  ChevronRightIcon,
  FolderIcon,
} from '@clinicfact/design-system';

interface ChatOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onMoveToFolder: () => void;
  onDeleteChat: () => void;
}

interface OptionItemProps {
  icon: JSX.Element;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}

const OptionItem: React.FC<OptionItemProps> = ({ icon, label, onPress, isDestructive }) => (
  <TouchableOpacity style={styles.optionItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.optionIcon}>{icon}</View>
    <Text style={[styles.optionLabel, isDestructive && styles.destructiveLabel]}>{label}</Text>
    <ChevronRightIcon size={20} color="#9CA3AF" />
  </TouchableOpacity>
);

export const ChatOptionsModal: React.FC<ChatOptionsModalProps> = ({
  visible,
  onClose,
  onMoveToFolder,
  onDeleteChat,
}) => {
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
              <View style={styles.handleBar} />
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Chat options</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseIcon size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.optionsList}>
                <OptionItem
                  icon={<FolderIcon size={40} color="#6B7280" />}
                  label="Move to folder"
                  onPress={onMoveToFolder}
                />
                <OptionItem
                  icon={<DeleteIcon size={40} />}
                  label="Delete chat"
                  onPress={onDeleteChat}
                  isDestructive
                />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[1],
  },
  optionsList: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  optionIcon: {
    marginRight: spacing[3],
  },
  optionLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  destructiveLabel: {
    color: colors.text.primary,
  },
});
