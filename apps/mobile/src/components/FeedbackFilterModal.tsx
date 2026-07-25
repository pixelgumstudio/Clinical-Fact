import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, typography } from '@clinicfact/design-system';

interface FeedbackFilterModalProps {
  visible: boolean;
  noteId?: string;
  onHappy: () => void;
  onSad: (comment: string) => void;
  onLater: () => void;
}

export const FeedbackFilterModal = ({
  visible,
  noteId,
  onHappy,
  onSad,
  onLater,
}: FeedbackFilterModalProps) => {
  const [phase, setPhase] = useState<'prompt' | 'sad-input'>('prompt');
  const [comment, setComment] = useState('');

  const handleSadPress = () => setPhase('sad-input');

  const handleSubmitComment = () => {
    onSad(comment.trim());
    setPhase('prompt');
    setComment('');
  };

  const handleCancel = () => {
    setPhase('prompt');
    setComment('');
  };

  const handleLater = () => {
    setPhase('prompt');
    setComment('');
    onLater();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleLater}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {phase === 'prompt' ? (
            <>
              <Text style={styles.emoji}>🎉</Text>
              <Text style={styles.title}>Your note is ready!</Text>
              <Text style={styles.subtitle}>How did we do?</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.reactionButton, styles.happyButton]}
                  onPress={onHappy}
                  activeOpacity={0.75}
                >
                  <Text style={styles.reactionEmoji}>👍</Text>
                  <Text style={styles.reactionLabel}>Happy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reactionButton, styles.sadButton]}
                  onPress={handleSadPress}
                  activeOpacity={0.75}
                >
                  <Text style={styles.reactionEmoji}>👎</Text>
                  <Text style={styles.reactionLabel}>Sad</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleLater} activeOpacity={0.6} style={styles.laterButton}>
                <Text style={styles.laterText}>Maybe Later</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>What went wrong?</Text>
              <Text style={styles.subtitle}>Your feedback helps us improve.</Text>

              <TextInput
                style={styles.textInput}
                placeholder="Tell us what could be better..."
                placeholderTextColor={colors.text.tertiary}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitComment}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCancel} activeOpacity={0.6} style={styles.laterButton}>
                <Text style={styles.laterText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
    paddingBottom: spacing[10],
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
    marginBottom: spacing[6],
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing[7],
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[5],
    width: '100%',
  },
  reactionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[5],
    borderRadius: 16,
    borderWidth: 1.5,
  },
  happyButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  sadButton: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F59E0B',
  },
  reactionEmoji: {
    fontSize: 32,
    marginBottom: spacing[1],
  },
  reactionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  laterButton: {
    paddingVertical: spacing[2],
  },
  laterText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  textInput: {
    width: '100%',
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary ?? colors.neutral[50],
    marginBottom: spacing[4],
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
});
