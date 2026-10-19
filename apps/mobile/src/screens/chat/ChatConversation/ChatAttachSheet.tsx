import React from 'react';
import { View, Text, TouchableOpacity, Animated, Modal, StyleSheet } from 'react-native';
import { spacing, Icon, theme, Switch as DSSwitch } from '@clinicalfact/design-system';
import { sheetChromeStyles } from './sheetChromeStyles';
import { useTranslation } from 'react-i18next';

interface ChatAttachSheetProps {
  visible: boolean;
  opacity: Animated.Value;
  translateY: Animated.Value;
  insetsBottom: number;
  onClose: () => void;
  onCameraCapture: () => void;
  onPhotoLibrary: () => void;
  onUploadFile: () => void;
  hasMessages: boolean;
  generatingActionId: string | null;
  onGenerateQuiz: () => void;
  onGenerateFlashcards: () => void;
  liveSearchEnabled: boolean;
  onToggleLiveSearch: (value: boolean) => void;
  isMedical: boolean;
  semanticScholarEnabled: boolean;
  pubmedEnabled: boolean;
  onToggleLiteratureSource: (key: 'semanticScholar' | 'pubmed') => void;
  onOpenFilters: () => void;
}

/** The redesigned "+" menu — card grid for attaching a new source, optional source-search
 *  toggles (medical chats only), and whole-chat quiz/flashcard generation once there's
 *  actually a conversation to draw from. */
export const ChatAttachSheet: React.FC<ChatAttachSheetProps> = ({
  visible,
  opacity,
  translateY,
  insetsBottom,
  onClose,
  onCameraCapture,
  onPhotoLibrary,
  onUploadFile,
  hasMessages,
  generatingActionId,
  onGenerateQuiz,
  onGenerateFlashcards,
  liveSearchEnabled,
  onToggleLiveSearch,
  isMedical,
  semanticScholarEnabled,
  pubmedEnabled,
  onToggleLiteratureSource,
  onOpenFilters,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[sheetChromeStyles.overlay, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            sheetChromeStyles.sheet,
            { transform: [{ translateY }], paddingBottom: insetsBottom + spacing[4] },
          ]}
        >
          <View style={sheetChromeStyles.handle} />
          <View style={sheetChromeStyles.header}>
            <TouchableOpacity onPress={onClose} style={sheetChromeStyles.closeButton} activeOpacity={0.7}>
              <Icon name="close" size={20} color={theme.colors.grey[900]} />
            </TouchableOpacity>
            <Text style={sheetChromeStyles.title}>{t('chat.chatAttachSheet.addToChat')}</Text>
            <View style={sheetChromeStyles.closeButton} />
          </View>

          <View style={styles.attachCardGrid}>
            <TouchableOpacity style={styles.attachCard} onPress={onCameraCapture} activeOpacity={0.7}>
              <View style={styles.attachCardIcon}>
                <Icon name="camera" size={24} color={theme.colors.yale[900]} />
              </View>
              <Text style={styles.attachCardText}>{t('chat.chatAttachSheet.camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachCard} onPress={onPhotoLibrary} activeOpacity={0.7}>
              <View style={styles.attachCardIcon}>
                <Icon name="imageFill" size={24} color={theme.colors.yale[900]} />
              </View>
              <Text style={styles.attachCardText}>{t('chat.chatAttachSheet.photos')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachCard} onPress={onUploadFile} activeOpacity={0.7}>
              <View style={styles.attachCardIcon}>
                <Icon name="files" size={24} color={theme.colors.yale[900]} />
              </View>
              <Text style={styles.attachCardText}>{t('chat.chatAttachSheet.files')}</Text>
            </TouchableOpacity>
          </View>

          {hasMessages && (
            <View style={styles.attachActionList}>
              <TouchableOpacity
                style={styles.attachActionRow}
                onPress={onGenerateQuiz}
                activeOpacity={0.7}
                disabled={!!generatingActionId}
              >
                <Icon name="quizFill" size={24} color={theme.colors.yale[700]} />
                <Text style={styles.attachActionText}>{t('chat.chatAttachSheet.generateQuiz')}</Text>
                <Icon name="foward" size={16} color={theme.colors.grey[200]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachActionRow}
                onPress={onGenerateFlashcards}
                activeOpacity={0.7}
                disabled={!!generatingActionId}
              >
                <Icon name="flashcardsFill" size={24} color={theme.colors.yale[700]} />
                <Text style={styles.attachActionText}>{t('chat.chatAttachSheet.generateFlashcards')}</Text>
                <Icon name="foward" size={16} color={theme.colors.grey[200]} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.sourceToggleSection}>
            <View style={styles.sourceToggleGroup}>
              <View style={styles.sourceToggleRow}>
                <Text style={styles.sourceToggleLabel}>{t('chat.chatAttachSheet.searchMedicalLiterature')}</Text>
                <DSSwitch value={liveSearchEnabled} onValueChange={onToggleLiveSearch} />
              </View>
              {/* The filter drill-in and the per-provider source toggles below only matter once
                  live search is actually on — for a medical_qa session it's always on, for any
                  other chat type it depends on the switch above. */}
              {(isMedical || liveSearchEnabled) && (
                <>
                  <View style={styles.sourceToggleDivider} />
                  <TouchableOpacity style={styles.sourceToggleRow} onPress={onOpenFilters} activeOpacity={0.7}>
                    <Text style={styles.sourceToggleLabel}>{t('chat.chatAttachSheet.filterByDateSourceAndType')}</Text>
                    <Icon name="foward" size={16} color={theme.colors.grey[200]} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {(isMedical || liveSearchEnabled) && (
              <>
                <Text style={styles.attachSheetCaption}>{t('chat.chatAttachSheet.pullsRealCitedSourcesIntoYour')}</Text>

                <Text style={styles.attachSheetSectionLabel}>{t('chat.chatAttachSheet.trustedmedicalsourcedatabase')}</Text>
                {/* Each toggle here gates a real, independent API (Semantic Scholar Graph API /
                    NCBI PubMed E-utilities), added alongside Europe PMC (which always runs
                    regardless) and merged+deduped into one citation list — see
                    chatService.chatMedicalLive. */}
                <View style={styles.sourceToggleGroup}>
                  <View style={styles.sourceToggleRow}>
                    <Text style={styles.sourceToggleLabel}>{t('chat.chatAttachSheet.semanticScholar')}</Text>
                    <DSSwitch value={semanticScholarEnabled} onValueChange={() => onToggleLiteratureSource('semanticScholar')} />
                  </View>
                  <View style={styles.sourceToggleDivider} />
                  <View style={styles.sourceToggleRow}>
                    <Text style={styles.sourceToggleLabel}>{t('chat.chatAttachSheet.usNationalLibraryOfMedicine')}</Text>
                    <DSSwitch value={pubmedEnabled} onValueChange={() => onToggleLiteratureSource('pubmed')} />
                  </View>
                  <View style={styles.sourceToggleDivider} />
                  <View style={styles.sourceToggleRow}>
                    <Text style={styles.sourceToggleLabel}>{t('chat.chatAttachSheet.fdaDrugTreatmentData')}</Text>
                    {/* Always on, not user-togglable — the actual FDA drug label lookup
                        (openFdaService) runs unconditionally whenever live search is on, so
                        this switch reflects that truthfully rather than implying it can be
                        turned off. No `disabled` prop: that style washes the track to a
                        neutral white regardless of value, which would visually read as "off"
                        — a no-op onValueChange keeps the true "on" (yale-700) look. */}
                    <DSSwitch value={true} onValueChange={() => {}} />
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  attachCardGrid: {
    flexDirection: 'row',
    gap: theme.spacing[5], // 20
  },
  attachCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing[4], // 16
    borderRadius: theme.borderRadius['2xl'], // 24
    backgroundColor: theme.colors.linen[100],
    gap: theme.spacing[1], // 4
  },
  attachCardIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachCardText: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  attachSheetSectionLabel: {
    ...theme.typography.textStyles.label2,
    color: theme.colors.grey[400],
    marginTop: theme.spacing[2], // 8
  },
  attachSheetCaption: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[400],
  },
  attachActionList: {
    width: '100%',
    gap: theme.spacing[4], // 16
    marginTop: theme.spacing[6], // 24
  },
  attachActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[4], // 16
  },
  attachActionText: {
    flex: 1,
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  sourceToggleSection: {
    width: '100%',
    gap: theme.spacing[2], // 8
    marginTop: theme.spacing[6], // 24 — matches attachActionList's own marginTop above it
  },
  sourceToggleGroup: {
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg, // 16
    overflow: 'hidden',
  },
  sourceToggleDivider: {
    height: 1,
    backgroundColor: theme.colors.grey[50],
  },
  sourceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[3], // 12
  },
  sourceToggleLabel: {
    flex: 1,
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
});
