import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, typography, Icon, theme } from '@clinicalfact/design-system';
import { PendingAttachment } from './types';

type ChatSourceType = 'note' | 'image' | 'document' | 'pdf' | 'audio' | 'medical_qa' | undefined;

interface ChatComposerProps {
  isLocked: boolean;
  onUpgrade: () => void;
  /** Free-tier medical queries left; null hides the "X QUERY REMAINING" header entirely. */
  queriesRemaining: number | null;
  insetsBottom: number;
  pendingAttachment: PendingAttachment | null;
  onRemovePendingAttachment: () => void;
  message: string;
  onChangeMessage: (text: string) => void;
  sessionId: string | null;
  embeddingStatus: string;
  type: ChatSourceType;
  isSendingMessage: boolean;
  isInputFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onOpenAttachMenu: () => void;
  onSend: () => void;
  /** Cancels the in-flight streaming response — shown in place of the send button while
   *  isSendingMessage is true. */
  onStopGenerating: () => void;
}

const getPlaceholder = (sessionId: string | null, embeddingStatus: string, type: ChatSourceType) => {
  if (!sessionId) return 'Ask a medical question to get more clarifications';
  if (embeddingStatus === 'completed') return 'Ask anything about this document...';
  if (embeddingStatus === 'failed') return 'Ask a question — attachment processing failed';
  if (type === 'image') return 'Extracting text...';
  if (type === 'document') return 'Processing PDF...';
  return 'Processing...';
};

/** The bottom input bar — a paywall prompt when the free-tier chat limit is hit, otherwise
 *  the text field + pending-attachment thumbnail + attach/send buttons. */
export const ChatComposer: React.FC<ChatComposerProps> = ({
  isLocked,
  onUpgrade,
  queriesRemaining,
  insetsBottom,
  pendingAttachment,
  onRemovePendingAttachment,
  message,
  onChangeMessage,
  sessionId,
  embeddingStatus,
  type,
  isSendingMessage,
  isInputFocused,
  onFocus,
  onBlur,
  onOpenAttachMenu,
  onSend,
  onStopGenerating,
}) => {
  if (isLocked) {
    return (
      <Pressable onPress={onUpgrade} style={[styles.lockedContainer, { marginBottom: insetsBottom > 0 ? insetsBottom : 16 }]}>
        <Text style={styles.lockedText}>Upgrade to Pro to continue chatting</Text>
      </Pressable>
    );
  }

  // While a response is streaming, the same button becomes "Stop Generating" instead of being
  // disabled — it stays enabled specifically so the user can tap it to cancel.
  // An attachment's embedding can end in 'completed' or 'failed' — either way the chat should
  // stay usable (a failed embed still leaves the retry card up; it shouldn't also lock the user
  // out of sending a plain-text message). Only 'pending'/'processing' actually block sending.
  const embeddingBlocking = !!sessionId && embeddingStatus !== 'completed' && embeddingStatus !== 'failed';
  const sendDisabled =
    !isSendingMessage &&
    (!message.trim() || embeddingBlocking || pendingAttachment?.isUploading);

  return (
    <View style={[styles.inputContainer, { paddingBottom: Math.max(insetsBottom, spacing[4]) }]}>
      {/* Main input card — an optional "X query remaining" header on top, then the text
          field, with attach (+) and send on a row below. The "+" is always available: with
          no chat open yet, it starts a new one; inside an open chat, it attaches to that
          chat instead. */}
      <View style={[styles.inputRow]}>
        {queriesRemaining !== null && (
          <View style={styles.creditsHeader}>
            <Text style={styles.creditsHeaderText}>{queriesRemaining} QUERY REMAINING</Text>
          </View>
        )}
        <View style={styles.inputBody}>
          {pendingAttachment && (
            <View style={styles.pendingAttachmentThumb}>
              {pendingAttachment.kind === 'image' ? (
                <Image source={{ uri: pendingAttachment.uri }} style={styles.pendingAttachmentImage} />
              ) : (
                <View style={styles.pendingAttachmentFileIcon}>
                  <Icon name="files" size={28} color={theme.colors.yale[900]} />
                </View>
              )}
              {pendingAttachment.isUploading && (
                <View style={styles.pendingAttachmentUploadingOverlay}>
                  <ActivityIndicator size="small" color={colors.white} />
                </View>
              )}
              <TouchableOpacity
                style={styles.pendingAttachmentClose}
                onPress={onRemovePendingAttachment}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={14} color={theme.colors.grey[900]} />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.textInput}
            placeholder={getPlaceholder(sessionId, embeddingStatus, type)}
            placeholderTextColor={theme.colors.grey[300]}
            value={message}
            onChangeText={onChangeMessage}
            multiline
            maxLength={1000}
            editable={!embeddingBlocking && !isSendingMessage}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <View style={styles.inputActionsRow}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={onOpenAttachMenu}
              activeOpacity={0.7}
            >
              <Icon name="add" size={20} color={theme.colors.grey[900]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                isSendingMessage && styles.sendButtonStreaming,
                sendDisabled && styles.sendButtonDisabled,
              ]}
              onPress={isSendingMessage ? onStopGenerating : onSend}
              disabled={sendDisabled}
              activeOpacity={0.7}
            >
              {isSendingMessage ? (
                <View style={styles.stopIcon} />
              ) : (
                <Image
                  source={require('../../../../assets/send_chat.png')}
                  style={styles.sendButtonImage}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {message.length > 800 && (
        <Text style={styles.characterCount}>{message.length}/1000</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  lockedContainer: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: colors.oneOff.lockedBannerBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.oneOff.lockedBannerGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    color: colors.oneOff.lockedBannerGold,
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.linen[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    backgroundColor: theme.colors.linen[300],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  inputRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.input, // 16
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    overflow: 'hidden',
    minHeight: 120,
  },

  creditsHeader: {
    backgroundColor: theme.colors.linen[300],
    // borderBottomWidth: 1,
    borderBottomColor: theme.colors.grey[100],
    paddingVertical: theme.spacing[2], // 8
    alignItems: 'center',
  },
  creditsHeaderText: {
    ...theme.typography.textStyles.label2,
    color: theme.colors.grey[900],
  },
  inputBody: {
    padding: theme.spacing[4], // 16
    gap: theme.spacing[4], // 16
  },
  pendingAttachmentThumb: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.linen[100],
    alignSelf: 'flex-start',
    overflow: 'visible',
  },
  pendingAttachmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
  },
  pendingAttachmentFileIcon: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAttachmentUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(28, 28, 28, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingAttachmentClose: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[900],
    maxHeight: 100,
    padding: 0,
  },
  characterCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    alignSelf: 'flex-end',
    marginTop: spacing[1],
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonStreaming: {
    backgroundColor: theme.colors.yale[700],
  },
  stopIcon: {
    width: 14,
    height: 14,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.white,
  },
  sendButtonImage: {
    width: 36,
    height: 36,
  },
});
