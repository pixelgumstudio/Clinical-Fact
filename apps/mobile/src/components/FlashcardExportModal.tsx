import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '@clinicfact/design-system';
import api from '../services/api';
import { handleExportFile, selectExportFormat } from '../utils/exportUtil';

interface FlashcardExportModalProps {
  visible: boolean;
  setId: string;
  setTitle: string;
  onClose: () => void;
}

export const FlashcardExportModal: React.FC<FlashcardExportModalProps> = ({
  visible,
  setId,
  setTitle,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'questions' | 'answers') => {
    try {
      setIsExporting(true);
      const format = await selectExportFormat();

      const blob = type === 'questions'
        ? await api.exportFlashcardQuestions(setId, format)
        : await api.exportFlashcardAnswers(setId, format);

      await handleExportFile(blob, {
        title: setTitle,
        format,
        isAnswers: type === 'answers',
      });

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Export {setTitle}</Text>
          <Text style={styles.subtitle}>Choose what to export</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => handleExport('questions')}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.info[500]} />
            ) : (
              <Text style={styles.buttonText}>Export Questions</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => handleExport('answers')}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.info[500]} />
            ) : (
              <Text style={styles.buttonText}>Export Answers</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={isExporting}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing[6],
    width: '80%',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    color: colors.text.tertiary,
    marginBottom: spacing[6],
  },
  button: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.info[500],
    borderRadius: 12,
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[0],
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
  },
  cancelButtonText: {
    color: colors.text.primary,
  },
});
