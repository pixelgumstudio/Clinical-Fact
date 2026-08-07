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
  EditNoteIcon,
  ExportIcon,
  // PrintIcon, // print removed
  DeleteIcon,
  ChevronRightIcon,
  TranscribeIcon,
  ChatWithNoteIcon,
  FolderIcon,
} from '@clinicalfact/design-system';
import { showInAppPaywall } from '../services/revenuecat';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';

interface NoteOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onEditNote?: () => void;
  onReTranscribe?: () => void;
  onChatWithNote?: () => void;
  onExportNote?: () => void;
  onPrintNote?: () => void; // reserved, currently unused
  onMoveToFolder?: () => void;
  onDeleteNote: () => void;
  hasAudioSource?: boolean;
}

interface OptionItemProps {
  icon: React.JSX.Element;
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

export const NoteOptionsModal: React.FC<NoteOptionsModalProps> = ({
  visible,
  onClose,
  onEditNote,
  onReTranscribe,
  onChatWithNote,
  onExportNote,
  onMoveToFolder,
  onDeleteNote,
  hasAudioSource = false,
}) => {
  // 1. Grab the stores
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);
  const user = useAuthStore((s) => s.user);

  // 2. Build the Shield
  const handleChatPress = async () => {
    const chatCount = user?.freeUsage?.chats?.count ?? 0;
    
    console.log('=== NOTE OPTIONS CHAT CHECK ===');
    console.log('hasAccess:', hasAccess);
    console.log('chatCount:', chatCount);

    if (!hasAccess && chatCount >= 1) {
      console.log('Blocked: Showing paywall after drawer closes.');
      onClose(); // Start the close animation
      
      // Give iOS 600ms to finish closing the drawer before showing the Paywall
      setTimeout(async () => {
        try {
          await showInAppPaywall();
        } catch (error) {
          console.error('Paywall failed:', error);
        }
      }, 600);
      
      return; // 🛑 Stop here! Do not call onChatWithNote()
    }

    // Normal flow for Pro users or Free users with quota
    onClose();
    if (onChatWithNote) {
      onChatWithNote();
    }
  };
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
                <Text style={styles.headerTitle}>Note options</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseIcon size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                {onEditNote && (
                  <OptionItem
                    icon={<EditNoteIcon size={40} />}
                    label="Edit note"
                    onPress={onEditNote}
                  />
                )}
                {hasAudioSource && onReTranscribe && (
                  <OptionItem
                    icon={<TranscribeIcon size={40} />}
                    label="Re-transcribe"
                    onPress={onReTranscribe}
                  />
                )}
                {onChatWithNote && (
                  <OptionItem
                    icon={<ChatWithNoteIcon size={40} />}
                    label="Chat with note"
                    onPress={handleChatPress}
                  />
                )}
                {onExportNote && (
                  <OptionItem
                    icon={<ExportIcon size={40} />}
                    label="Export note"
                    onPress={onExportNote}
                  />
                )}
                {onMoveToFolder && (
                  <OptionItem
                    icon={<FolderIcon size={40} color="#6B7280" />}
                    label="Move to folder"
                    onPress={onMoveToFolder}
                  />
                )}
                <OptionItem
                  icon={<DeleteIcon size={40} />}
                  label="Delete note"
                  onPress={onDeleteNote}
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
