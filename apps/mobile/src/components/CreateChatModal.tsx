import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  CloseIcon,
  ChatWithNoteIcon,
  ChatWithImageIcon,
  ChatWithDocumentIcon,
  ChevronRightIcon,
} from '@clinicfact/design-system';

// 🛡️ Added our auth and paywall imports
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { showInAppPaywall } from '../services/revenuecat';

interface CreateChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: 'note' | 'image' | 'document') => void;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  visible,
  onClose,
  onSelectType,
}) => {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  // 🛡️ 1. Grab the stores
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);
  const user = useAuthStore((s) => s.user);

  // 🛡️ 2. Build the Bouncer/Shield
 const handleOptionPress = async (type: 'note' | 'image' | 'document') => {
    // 🛡️ NUCLEAR OPTION: If they aren't Pro, they can't create new chats.
    // We do this because the chatCount is reporting 0 even when it's not.
    if (!hasAccess) {
      console.log('Strict Block: Free user tapping Chat. Showing paywall.');
      onClose(); 
      
      setTimeout(async () => {
        try {
          await showInAppPaywall();
        } catch (error) {
          console.error('Paywall failed:', error);
        }
      }, 600);
      
      return; 
    }

    // Normal flow for Pro users
    onClose();
    if (onSelectType) {
      onSelectType(type);
    }
  };

  const chatOptions = [
    {
      id: 'note',
      title: 'Chat with any note',
      icon: <ChatWithNoteIcon size={40} />,
      type: 'note' as const,
    },
    {
      id: 'image',
      title: 'Chat with any image',
      icon: <ChatWithImageIcon size={40} />,
      type: 'image' as const,
    },
    {
      id: 'document',
      title: 'Chat with any document',
      icon: <ChatWithDocumentIcon size={40} />,
      type: 'document' as const,
    },
  ];

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
            <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.5 }]}>
              {/* Handle bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Create chat</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <CloseIcon size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.optionsContainer}>
                {chatOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.optionItem}
                    // 🛡️ 3. Replaced direct call with our shield function
                    onPress={() => handleOptionPress(option.type)}
                    activeOpacity={0.7}
                  >
                    {option.icon}
                    <Text style={styles.optionText}>{option.title}</Text>
                    <ChevronRightIcon size={20} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ))}
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
  modalContent: {
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
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[1],
  },
  optionsContainer: {
    paddingTop: spacing[2],
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  optionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginLeft: spacing[3],
  },
});
