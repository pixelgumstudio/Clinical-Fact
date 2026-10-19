import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography } from '@clinicalfact/design-system';
import { Trans, useTranslation } from 'react-i18next';

interface AIConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const AIConsentModal = ({ visible, onAccept, onDecline }: AIConsentModalProps) => {
  const { t } = useTranslation();
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
          <Text style={styles.title}>{t('components.aiConsent.beforeWeProcessYourContent')}</Text>
          <Text style={styles.subtitle}>
           {t('components.aiConsent.clinicalFactUsesAIToAnswer')}
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Data sent */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('components.aiConsent.whatDataIsSent')}</Text>
              <View style={styles.bulletList}>
                <BulletItem text={t('components.aiConsent.questionsAndMessagesYouTypeIn')} />
                <BulletItem text={t('components.aiConsent.audioRecordingsOrUploadedAudioFiles')} />
                <BulletItem text={t('components.aiConsent.pdfAndTextDocumentsYouUpload')} />
                <BulletItem text={t('components.aiConsent.imagesYouUpload')} />
                <BulletItem text={t('components.aiConsent.youTubeVideoURLsAndTheirTranscripts')} />
                <BulletItem text={t('components.aiConsent.customTextYouEnter')} />
              </View>
            </View>

            {/* Who receives it */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('components.aiConsent.whoReceivesYourData')}</Text>
              <Text style={styles.sectionBody}>
                <Trans i18nKey="components.aiConsent.whoReceivesBody" components={{ bold: <Text style={styles.bold} /> }} />
              </Text>
            </View>

            {/* How it's used */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('components.aiConsent.howItSUsed')}</Text>
              <Text style={styles.sectionBody}>
               {t('components.aiConsent.yourContentIsUsedSolelyTo')}
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.agreeButton} onPress={onAccept} activeOpacity={0.85}>
              <Text style={styles.agreeText}>{t('components.aiConsent.iAgreeContinue')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={onDecline} activeOpacity={0.85}>
              <Text style={styles.declineText}>{t('components.aiConsent.noThanks')}</Text>
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
    color: colors.white,
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
