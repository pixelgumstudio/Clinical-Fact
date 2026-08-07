import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Icon, theme, Switch as DSSwitch } from '@clinicalfact/design-system';

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
      onRequestClose={isLoading ? undefined : onClose}
    >
      <TouchableWithoutFeedback onPress={isLoading ? undefined : onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.handleBar} />
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle} numberOfLines={1}>Export {title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isLoading}
                >
                  <Icon name="close" size={20} color={theme.colors.grey[600]} />
                </TouchableOpacity>
              </View>

              {/* Format Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select format</Text>
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
                <Text style={styles.sectionTitle}>Include answers</Text>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLeft}>
                    <Icon name="sucessful" size={20} color={theme.colors.yale[700]} />
                    <Text style={styles.toggleLabel}>
                      {includeAnswers
                        ? 'Answers & explanations included'
                        : 'Questions only'}
                    </Text>
                  </View>
                  <DSSwitch
                    value={includeAnswers}
                    onValueChange={setIncludeAnswers}
                    disabled={isLoading}
                  />
                </View>
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
    backgroundColor: 'rgba(2, 22, 39, 0.35)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius['3xl'],
    borderTopRightRadius: theme.borderRadius['3xl'],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[8],
  },
  handleBar: {
    width: 60,
    height: 8,
    backgroundColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.full,
    alignSelf: 'center',
    marginBottom: theme.spacing[5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[5],
  },
  headerTitle: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    flex: 1,
    marginRight: theme.spacing[3],
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[5],
  },
  sectionTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[3],
  },
  formatButtonsContainer: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  formatButton: {
    flex: 1,
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.linen[100],
    borderWidth: 1.5,
    borderColor: theme.colors.linen[100],
    alignItems: 'center',
  },
  formatButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.yale[700],
  },
  formatButtonText: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[600],
  },
  formatButtonTextActive: {
    color: theme.colors.yale[700],
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    flex: 1,
    marginRight: theme.spacing[3],
  },
  toggleLabel: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[900],
    flex: 1,
  },
  errorContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.red[50],
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing[5],
    marginBottom: theme.spacing[4],
  },
  errorText: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.red[600],
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[5],
    marginTop: theme.spacing[2],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  exportButton: {
    flex: 1,
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    ...theme.typography.textStyles.button2,
    color: theme.colors.grey[900],
  },
  exportButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
});
