import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import { colors, spacing, typography, CloseIcon, RecordAudioGradientIcon, UploadAudioGradientIcon, YoutubeGradientIcon, PDFDocumentGradientIcon, CustomTextGradientIcon, ImageGradientIcon } from '@clinicfact/design-system';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { showInAppPaywall } from '../services/revenuecat';

interface CreateNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption?: (optionType: string) => void;
}

interface NoteOptionProps {
  icon: JSX.Element;
  title: string;
  description: string;
  onPress: () => void;
}

const NoteOption: React.FC<NoteOptionProps> = ({ icon, title, description, onPress }) => (
  <TouchableOpacity style={styles.optionItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.optionIcon}>{icon}</View>
    <View style={styles.optionContent}>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({ visible, onClose, onSelectOption }) => {
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);
  const user = useAuthStore((s) => s.user);

  const noteOptions = [
    {
      icon: <RecordAudioGradientIcon size={48} />,
      title: 'Record audio',
      description: 'Generate a note from any recorded audio',
      type: 'record_audio',
    },
    {
      icon: <UploadAudioGradientIcon size={48} />,
      title: 'Upload audio',
      description: 'Create a note from any uploaded audio',
      type: 'upload_audio',
    },
    {
      icon: <YoutubeGradientIcon size={48} />,
      title: 'Youtube video',
      description: 'Create a note from any youtube video',
      type: 'youtube',
    },
    {
      icon: <PDFDocumentGradientIcon size={48} />,
      title: 'PDF or Document',
      description: 'Create a note from PDF or Document',
      type: 'pdf_document',
    },
    {
      icon: <CustomTextGradientIcon size={48} />,
      title: 'Custom text',
      description: 'Create a note from captured text',
      type: 'custom_text',
    },
    {
      icon: <ImageGradientIcon size={48} />,
      title: 'Image',
      description: 'Create a note from any Image',
      type: 'image',
    },
  ];

  // const handleOptionPress = async (optionType: string) => {
  //   if (!hasAccess && (user?.freeUsage?.notes?.count ?? 0) >= 1) {
  //     onClose();
  //     await showInAppPaywall();
  //     return;
  //   }
  //   onClose();
  //   if (onSelectOption) {
  //     onSelectOption(optionType);
  //   }
  // };

const handleOptionPress = async (optionType: string) => {
    // 🛡️ Pre-flight Check
    if (!hasAccess && (user?.notesCount ?? 0) >= 1) {
      console.log('Triggering close animation...');
      onClose(); // Tell the menu to close
      
      // Give iOS 600ms to completely finish closing the bottom sheet
      setTimeout(async () => {
        try {
          console.log('Attempting to show Paywall now...');
          await showInAppPaywall();
        } catch (error) {
          console.error('Paywall failed to open:', error);
        }
      }, 600);
      
      return; 
    }
    
    // Normal flow
    onClose();
    if (onSelectOption) {
      onSelectOption(optionType);
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
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Create note</Text>
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
                {noteOptions.map((option, index) => (
                  <NoteOption
                    key={index}
                    icon={option.icon}
                    title={option.title}
                    description={option.description}
                    onPress={() => handleOptionPress(option.type)}
                  />
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
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    maxHeight: '80%',
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
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[1],
  },
  optionsList: {
    paddingTop: spacing[2],
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
  },
  optionIcon: {
    marginRight: spacing[3],
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});
