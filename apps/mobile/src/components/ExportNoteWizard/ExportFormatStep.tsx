import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  CloseIcon,
  RadioSelectedIcon,
  RadioUnselectedIcon,
} from '@clinicalfact/design-system';
import type { ExportType } from './ExportNoteWizardModal';
import { useTranslation } from 'react-i18next';

type FormatOption = {
  id: string;
  labelKey: string;
};

const summaryFormats: FormatOption[] = [
  { id: 'txt', labelKey: 'components.exportFormat.txtFile' },
  { id: 'pdf', labelKey: 'components.exportFormat.pdfFile' },
  { id: 'doc', labelKey: 'components.exportFormat.docFile' },
];

const transcriptFormats: FormatOption[] = [
  { id: 'txt', labelKey: 'components.exportFormat.txtFile' },
  { id: 'pdf', labelKey: 'components.exportFormat.pdfFile' },
  { id: 'doc', labelKey: 'components.exportFormat.docFile' },
];

interface ExportFormatStepProps {
  visible: boolean;
  exportType: ExportType | null;
  onClose: () => void;
  onExport: (format: string) => void;
}

export const ExportFormatStep: React.FC<ExportFormatStepProps> = ({
  visible,
  exportType,
  onClose,
  onExport,
}) => {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');

  const getTitle = () => {
    switch (exportType) {
      case 'summary':
        return t('components.exportFormatStep.exportSummaryAs');
      case 'transcript':
        return t('components.exportFormatStep.exportTranscriptAs');
      default:
        return t('components.exportFormatStep.exportAs');
    }
  };

  const getButtonLabel = () => {
    switch (exportType) {
      case 'summary':
        return t('components.exportFormatStep.exportSummary');
      case 'transcript':
        return t('components.exportFormatStep.exportTranscript');
      default:
        return 'Export';
    }
  };

  const getFormats = (): FormatOption[] => {
    switch (exportType) {
      case 'transcript':
        return transcriptFormats;
      default:
        return summaryFormats;
    }
  };

  const formats = getFormats();

  React.useEffect(() => {
    setSelectedFormat('pdf');
  }, [exportType]);

  const handleExport = () => {
    onExport(selectedFormat);
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
                <Text style={styles.headerTitle}>{getTitle()}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseIcon size={24} color={colors.slate[500]} />
                </TouchableOpacity>
              </View>

              {/* Format Options */}
              <View style={styles.formatsList}>
                {formats.map((format) => (
                  <TouchableOpacity
                    key={format.id}
                    style={[
                      styles.formatItem,
                      selectedFormat === format.id && styles.formatItemSelected,
                    ]}
                    onPress={() => setSelectedFormat(format.id)}
                    activeOpacity={0.7}
                  >
                    {selectedFormat === format.id ? (
                      <RadioSelectedIcon size={20} color={colors.vivid.accent[500]} />
                    ) : (
                      <RadioUnselectedIcon size={20} color={colors.slate[300]} />
                    )}
                    <Text
                      style={[
                        styles.formatLabel,
                        selectedFormat === format.id && styles.formatLabelSelected,
                      ]}
                    >
                      {t(format.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Export Button */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={handleExport}
                  activeOpacity={0.8}
                >
                  <Text style={styles.exportButtonText}>{getButtonLabel()}</Text>
                </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[1],
  },
  formatsList: {
    paddingHorizontal: spacing[5],
  },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
    marginBottom: spacing[2],
    backgroundColor: colors.background.primary,
  },
  formatItemSelected: {
    backgroundColor: colors.vivid.accent[50],
  },
  formatLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginLeft: spacing[3],
  },
  formatLabelSelected: {
    fontWeight: typography.fontWeight.medium,
  },
  buttonContainer: {
    paddingHorizontal: spacing[5],
    marginTop: spacing[4],
  },
  exportButton: {
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.white,
  },
});
