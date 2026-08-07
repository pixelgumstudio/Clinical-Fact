import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  PDFDocumentIcon,
  ImageIcon,
  AudioFileIcon,
} from '@clinicalfact/design-system';

interface UploadProgressModalProps {
  visible: boolean;
  type: 'image' | 'document' | 'audio';
  fileName?: string;
  progress?: number;
  status: 'uploading' | 'processing' | 'creating-chat' | 'success' | 'error';
  errorMessage?: string;
}

export const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  visible,
  type,
  fileName,
  status,
  errorMessage,
}) => {
  const getIcon = () => {
    if (status === 'error') {
      return <Text style={styles.errorIcon}>⚠️</Text>;
    }
    if (status === 'success') {
      return <Text style={styles.successIcon}>✓</Text>;
    }
    if (type === 'document') {
      return <PDFDocumentIcon size={48} color="#F97316" />;
    }
    if (type === 'audio') {
      return <AudioFileIcon size={48} />;
    }
    return <ImageIcon size={48} color="#F97316" />;
  };

  const getTitle = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return type === 'image' ? 'Extracting text...' : type === 'audio' ? 'Transcribing audio...' : 'Processing PDF...';
      case 'creating-chat':
        return 'Setting up chat...';
      case 'success':
        return 'Ready!';
      case 'error':
        return 'Upload Failed';
      default:
        return 'Processing...';
    }
  };

  const getDescription = () => {
    if (status === 'error') {
      return errorMessage || 'Failed to upload file. Please try again.';
    }
    if (status === 'success') {
      return 'Your file is ready for chatting!';
    }
    if (status === 'uploading') {
      return 'Uploading your file to the server...';
    }
    if (status === 'processing') {
      return type === 'image'
        ? 'Extracting text from your image...'
        : type === 'audio'
          ? 'Transcribing your audio...'
          : 'Extracting text from your PDF...';
    }
    if (status === 'creating-chat') {
      return 'Creating your chat session...';
    }
    return 'Please wait...';
  };

  const getStatusColor = () => {
    if (status === 'error') return '#DC2626';
    if (status === 'success') return '#10B981';
    return '#F97316';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <TouchableWithoutFeedback>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Icon */}
            <View style={[styles.iconContainer, { borderColor: getStatusColor() }]}>
              {getIcon()}
            </View>

            {/* Title */}
            <Text style={styles.title}>{getTitle()}</Text>

            {/* File Name */}
            {fileName && status !== 'error' && (
              <Text style={styles.fileName} numberOfLines={1}>
                {fileName}
              </Text>
            )}

            {/* Description */}
            <Text style={[
              styles.description,
              status === 'error' ? styles.errorDescription : undefined,
            ]}>
              {getDescription()}
            </Text>

            {/* Progress Indicator */}
            {status !== 'error' && status !== 'success' && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="large" color={getStatusColor()} />
              </View>
            )}

            {/* Progress Steps */}
            {status !== 'error' && status !== 'success' && (
              <View style={styles.stepsContainer}>
                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepDot,
                    status === 'uploading' ? styles.stepDotActive : undefined,
                    (status === 'processing' || status === 'creating-chat') ? styles.stepDotComplete : undefined,
                  ]} />
                  <Text style={[
                    styles.stepText,
                    status === 'uploading' ? styles.stepTextActive : undefined,
                  ]}>
                    Upload file
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepDot,
                    status === 'processing' ? styles.stepDotActive : undefined,
                    status === 'creating-chat' ? styles.stepDotComplete : undefined,
                  ]} />
                  <Text style={[
                    styles.stepText,
                    status === 'processing' ? styles.stepTextActive : undefined,
                  ]}>
                    Process content
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepDot,
                    status === 'creating-chat' ? styles.stepDotActive : undefined,
                    undefined,
                  ]} />
                  <Text style={[
                    styles.stepText,
                    status === 'creating-chat' ? styles.stepTextActive : undefined,
                  ]}>
                    Create chat
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    padding: spacing[6],
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF7ED',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  successIcon: {
    fontSize: 56,
    color: '#10B981',
  },
  errorIcon: {
    fontSize: 56,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  fileName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textAlign: 'center',
    maxWidth: '100%',
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  errorDescription: {
    color: '#DC2626',
  },
  progressContainer: {
    marginVertical: spacing[4],
  },
  stepsContainer: {
    alignSelf: 'stretch',
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.neutral[200],
    marginRight: spacing[3],
  },
  stepDotActive: {
    backgroundColor: '#F97316',
  },
  stepDotComplete: {
    backgroundColor: '#10B981',
  },
  stepText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  stepTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
});
