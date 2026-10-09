import React from 'react';
import { View, Text, TouchableOpacity, Image, Linking, Modal, StyleSheet } from 'react-native';
import { spacing, typography, colors } from '@clinicalfact/design-system';
import { MedicalChatImage } from '../../../services/api';

interface ChatImagePreviewModalProps {
  image: MedicalChatImage | null;
  onClose: () => void;
}

/** Full-screen preview for a tapped citation image or sent attachment thumbnail. */
export const ChatImagePreviewModal: React.FC<ChatImagePreviewModalProps> = ({ image, onClose }) => (
  <Modal
    visible={!!image}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.imagePreviewOverlay}>
      <TouchableOpacity
        style={styles.imagePreviewCloseButton}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Text style={styles.imagePreviewCloseText}>✕</Text>
      </TouchableOpacity>
      {!!image && (
        <TouchableOpacity
          style={styles.imagePreviewBackdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <Image
            source={{ uri: image.url }}
            style={styles.imagePreviewFull}
            resizeMode="contain"
          />
          {!!image.attribution && (
            <Text style={styles.imagePreviewAttribution}>
              {image.attribution}
              {image.license ? ` · ${image.license}` : ''}
            </Text>
          )}
          {!!image.contextUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(image.contextUrl)} activeOpacity={0.7}>
              <Text style={styles.imagePreviewSourceLink}>View source ↗</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  imagePreviewCloseButton: {
    position: 'absolute',
    top: 56,
    right: spacing[4],
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewCloseText: {
    fontSize: 18,
    color: colors.white,
  },
  imagePreviewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  imagePreviewFull: {
    width: '100%',
    height: '70%',
  },
  imagePreviewAttribution: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing[4],
    textAlign: 'center',
  },
  imagePreviewSourceLink: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing[2],
    textDecorationLine: 'underline',
  },
});
