import React from 'react';
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
  ExportSummaryIcon,
  ExportTranscriptIcon,
  ChevronRightIcon,
} from '@clinicfact/design-system';

export type ExportType = 'summary' | 'transcript';

interface ExportNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExportType: (type: ExportType) => void;
}

interface ExportOptionProps {
  icon: JSX.Element;
  label: string;
  onPress: () => void;
}

const ExportOption: React.FC<ExportOptionProps> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.optionItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.optionIcon}>{icon}</View>
    <Text style={styles.optionLabel}>{label}</Text>
    <ChevronRightIcon size={20} color="#9CA3AF" />
  </TouchableOpacity>
);

export const ExportNoteModal: React.FC<ExportNoteModalProps> = ({
  visible,
  onClose,
  onSelectExportType,
}) => {
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
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Export note</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseIcon size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                <ExportOption
                  icon={<ExportSummaryIcon size={40} />}
                  label="Export summary"
                  onPress={() => onSelectExportType('summary')}
                />
                <ExportOption
                  icon={<ExportTranscriptIcon size={40} />}
                  label="Export Transcript"
                  onPress={() => onSelectExportType('transcript')}
                />
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
    paddingBottom: spacing[8],
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing[1],
  },
  optionsList: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  optionIcon: {
    marginRight: spacing[3],
  },
  optionLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
});
