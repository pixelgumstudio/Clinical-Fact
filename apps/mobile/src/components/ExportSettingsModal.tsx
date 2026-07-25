import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  colors,
  spacing,
  typography,
  CloseIcon,
} from '@clinicfact/design-system';

interface ExportSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (format: 'pdf' | 'docx', includeAnswers: boolean) => Promise<void>;
  title: string;
  isLoading?: boolean;
  error?: string | null;
}

export const ExportSettingsModal: React.FC<ExportSettingsModalProps> = ({
  visible,
  onClose,
  onExport,
  title,
  isLoading = false,
  error = null,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx'>('pdf');
  const [includeAnswers, setIncludeAnswers] = useState(true);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedFormat('pdf');
      setIncludeAnswers(true);
    }
  }, [visible]);

  const handleExport = async () => {
    await onExport(selectedFormat, includeAnswers);
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
              <View style={styles.handleBar} />
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Export {title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isLoading}
                >
                  <CloseIcon size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Format Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Format</Text>
                <View style={styles.formatButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.formatButton,
                      selectedFormat === 'pdf' && styles.formatButtonActive,
                    ]}
                    onPress={() => setSelectedFormat('pdf')}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.formatButtonText,
                        selectedFormat === 'pdf' && styles.formatButtonTextActive,
                      ]}
                    >
                      PDF
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.formatButton,
                      selectedFormat === 'docx' && styles.formatButtonActive,
                    ]}
                    onPress={() => setSelectedFormat('docx')}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.formatButtonText,
                        selectedFormat === 'docx' && styles.formatButtonTextActive,
                      ]}
                    >
                      DOCX
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Content Selection */}
              <View style={styles.section}>
                <View style={styles.contentHeader}>
                  <Text style={styles.sectionTitle}>Include Answers</Text>
                  <Switch
                    value={includeAnswers}
                    onValueChange={setIncludeAnswers}
                    disabled={isLoading}
                    trackColor={{ false: '#D1D5DB', true: colors.primary[500] }}
                    thumbColor={includeAnswers ? colors.primary[600] : '#F3F4F6'}
                  />
                </View>
                <Text style={styles.contentSubtext}>
                  {includeAnswers
                    ? 'Export will include answers and explanations'
                    : 'Export will include questions only'}
                </Text>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
                  onPress={onClose}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportButton, isLoading && styles.buttonDisabled]}
                  onPress={handleExport}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.exportButtonText}>Export</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Loading Message */}
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Exporting...</Text>
                </View>
              )}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  section: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  formatButtonsContainer: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  formatButton: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
    alignItems: 'center',
  },
  formatButtonActive: {
    borderColor: colors.primary[500],
    backgroundColor: '#EFF6FF',
  },
  formatButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  formatButtonTextActive: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  errorContainer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: '#DC2626',
    fontWeight: typography.fontWeight.medium,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    marginTop: spacing[4],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    backgroundColor: colors.background.primary,
    alignItems: 'center',
  },
  exportButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  exportButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});
