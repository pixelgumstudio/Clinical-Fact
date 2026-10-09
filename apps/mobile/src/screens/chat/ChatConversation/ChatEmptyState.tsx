import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import {
  colors,
  spacing,
  typography,
  DocumentPreviewSmallIcon,
  ImagePreviewSmallIcon,
  NoteFilePreviewIcon,
} from '@clinicalfact/design-system';
import { ChatWelcomeHero } from './ChatWelcomeHero';

type ChatSourceType = 'note' | 'image' | 'document' | 'pdf' | 'audio' | 'medical_qa' | undefined;

interface ChatEmptyStateProps {
  isLoadingSession: boolean;
  sessionId: string | null;
  embeddingStatus: string;
  embeddingProgress: number;
  isMedical: boolean;
  type: ChatSourceType;
  fileName?: string;
  title?: string;
  onSelectTopic: (question: string) => void;
  onGoBack: () => void;
}

/** What the FlatList shows in place of message history — picked from session/embedding
 *  state, so exactly one of these six views is ever visible at a time. */
export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  isLoadingSession,
  sessionId,
  embeddingStatus,
  embeddingProgress,
  isMedical,
  type,
  fileName,
  title,
  onSelectTopic,
  onGoBack,
}) => {
  if (isLoadingSession) {
    return (
      <View style={styles.emptyChat}>
        <ActivityIndicator size="large" color={colors.neutral[900]} />
        <Text style={styles.emptyText}>Initializing chat...</Text>
      </View>
    );
  }

  if (!sessionId) {
    return (
      <View style={styles.emptyChat}>
        <ChatWelcomeHero onSelectTopic={onSelectTopic} />
      </View>
    );
  }

  if (embeddingStatus === 'processing') {
    return (
      <View style={styles.emptyChat}>
        <View style={styles.attachedDocument}>
          <View style={styles.attachedDocumentIcon}>
            {type === 'note' && <NoteFilePreviewIcon size={48} />}
            {type === 'image' && <ImagePreviewSmallIcon size={48} color={colors.vivid.accent[500]} />}
            {type === 'document' && <DocumentPreviewSmallIcon size={48} color={colors.vivid.accent[500]} />}
          </View>
          <View style={styles.attachedDocumentInfo}>
            <Text style={styles.attachedDocumentTitle} numberOfLines={2}>
              {fileName || title}
            </Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${embeddingProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{embeddingProgress}%</Text>
            </View>
            <Text style={styles.embeddingStatusText}>
              {type === 'image' ? 'Extracting text from image...' :
               type === 'document' ? 'Processing PDF document...' :
               'Analyzing your note...'}
            </Text>
          </View>
        </View>
        <View style={styles.processingInfo}>
          <Text style={styles.processingInfoText}>
            ⏱️ This usually takes just a few seconds. You'll be able to chat once processing is complete.
          </Text>
        </View>
      </View>
    );
  }

  if (embeddingStatus === 'failed') {
    return (
      <View style={styles.emptyChat}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Processing Failed</Text>
          <Text style={styles.errorSubtext}>
            We couldn't process this {type === 'note' ? 'note' : type === 'image' ? 'image' : 'document'}.
            This might be due to:
          </Text>
          <View style={styles.errorReasons}>
            <Text style={styles.errorReason}>• File might be corrupted or unreadable</Text>
            <Text style={styles.errorReason}>• {type === 'image' ? 'Image quality too low' : type === 'document' ? 'PDF is password-protected' : 'Content format not supported'}</Text>
            <Text style={styles.errorReason}>• Network connection issue</Text>
          </View>
          <TouchableOpacity style={styles.errorButton} onPress={onGoBack}>
            <Text style={styles.errorButtonText}>Try a Different File</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isMedical) {
    return (
      <View style={styles.emptyChat}>
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            💡 Ask any clinical question — no upload needed. I'll answer using cited medical literature, with relevant images where available.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.emptyChat}>
      <View style={styles.attachedDocument}>
        <View style={styles.attachedDocumentIcon}>
          {type === 'note' && <NoteFilePreviewIcon size={40} />}
          {type === 'image' && <ImagePreviewSmallIcon size={40} color={colors.vivid.info[500]} />}
          {type === 'document' && <DocumentPreviewSmallIcon size={40} color={colors.vivid.info[500]} />}
        </View>
        <View style={styles.attachedDocumentInfo}>
          <Text style={styles.attachedDocumentTitle} numberOfLines={2}>
            {fileName || title}
          </Text>
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>✓ Ready to chat</Text>
          </View>
        </View>
      </View>
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          💡 Ask me anything about this {type === 'note' ? 'note' : type === 'image' ? 'image' : 'document'}. I can summarize, explain concepts, or answer specific questions.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyChat: {
    paddingTop: spacing[4],
    alignItems: 'center',
  },
  emptyText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  errorContainer: {
    backgroundColor: colors.vivid.error[50],
    borderRadius: 16,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.vivid.error[100],
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing[2],
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.vivid.error[600],
    marginBottom: spacing[2],
  },
  errorSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.vivid.error[800],
    textAlign: 'center',
    marginBottom: spacing[3],
    lineHeight: 20,
  },
  errorReasons: {
    alignSelf: 'stretch',
    marginBottom: spacing[4],
  },
  errorReason: {
    fontSize: typography.fontSize.sm,
    color: colors.vivid.error[900],
    marginBottom: spacing[1],
    lineHeight: 20,
  },
  errorButton: {
    backgroundColor: colors.vivid.error[600],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: 12,
  },
  errorButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  attachedDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.vivid.info[100],
    borderRadius: 8,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.vivid.info[200],
    width: '100%',
    maxWidth: 280,
  },
  attachedDocumentIcon: {
    marginRight: spacing[2],
  },
  attachedDocumentInfo: {
    flex: 1,
  },
  attachedDocumentTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.vivid.info[800],
    marginBottom: 0,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: spacing[2],
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.vivid.warning[500],
    borderRadius: 3,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    width: 35,
  },
  embeddingStatusText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  readyBadge: {
    backgroundColor: colors.vivid.success[200],
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: spacing[1],
  },
  readyBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.vivid.success[600],
  },
  hintContainer: {
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    padding: spacing[3],
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  hintText: {
    fontSize: typography.fontSize.sm,
    color: colors.slate[500],
    lineHeight: 20,
  },
  processingInfo: {
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    padding: spacing[3],
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  processingInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.slate[500],
    lineHeight: 20,
    textAlign: 'center',
  },
});
