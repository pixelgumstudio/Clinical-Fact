import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography } from '@clinicfact/design-system';

interface AIConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const AIConsentModal = ({ visible, onAccept, onDecline }: AIConsentModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.handle} />
          <Text style={styles.title}>Before we process your content</Text>
          <Text style={styles.subtitle}>
            ClinicFact uses AI to turn your content into notes. Here's what you need to know:
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Data sent */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What data is sent</Text>
              <View style={styles.bulletList}>
                <BulletItem text="Audio recordings or uploaded audio files" />
                <BulletItem text="PDF and Word documents" />
                <BulletItem text="Images you upload" />
                <BulletItem text="YouTube video URLs and their transcripts" />
                <BulletItem text="Custom text you enter" />
              </View>
            </View>

            {/* Who receives it */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Who receives your data</Text>
              <Text style={styles.sectionBody}>
                Your content is sent to <Text style={styles.bold}>OpenAI</Text> (for transcription and note generation) via our secure backend servers. We do not sell your data to any third party.
              </Text>
            </View>

            {/* How it's used */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How it's used</Text>
              <Text style={styles.sectionBody}>
                Your content is used solely to generate your notes. OpenAI's data usage policies apply to content processed through their API. For more details, see our Privacy Policy.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.agreeButton} onPress={onAccept} activeOpacity={0.85}>
              <Text style={styles.agreeText}>I Agree — Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={onDecline} activeOpacity={0.85}>
              <Text style={styles.declineText}>No Thanks</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const BulletItem = ({ text }: { text: string }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bullet}>•</Text>
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[10],
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize['xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  scroll: {
    marginBottom: spacing[4],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  sectionBody: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  bulletList: {
    gap: spacing[2],
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  bullet: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actions: {
    gap: spacing[3],
  },
  agreeButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: 'center',
  },
  agreeText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  declineButton: {
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  declineText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
});
