import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { Icon, theme } from "@clinicalfact/design-system";

interface CreateFlashcardsModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerateFlashcards: (questionCount: number) => void;
  isGenerating?: boolean;
  noteTitle?: string;
}

export const CreateFlashcardsModal: React.FC<CreateFlashcardsModalProps> = ({
  visible,
  onClose,
  onGenerateFlashcards,
  isGenerating = false,
  noteTitle,
}) => {
  const [questionCount, setQuestionCount] = useState(3);

  const handleDecreaseQuestions = () => {
    if (questionCount > 1) {
      setQuestionCount(questionCount - 1);
    }
  };

  const handleIncreaseQuestions = () => {
    if (questionCount < 50) {
      setQuestionCount(questionCount + 1);
    }
  };

  const handleGenerate = () => {
    onGenerateFlashcards(questionCount);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isGenerating ? undefined : onClose}
    >
      <TouchableWithoutFeedback onPress={isGenerating ? undefined : onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={isGenerating}>
                  <Icon name="close" size={20} color={theme.colors.grey[900]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Generate flashcards
                </Text>
                <View style={styles.closeButton} />
              </View>

              {/* Content */}
              <View style={styles.content}>
                {/* Flashcards Icon */}
                <View style={styles.iconCircle}>
                  <Icon name="flashcardsFill" size={40} color="#FFFFFF" />
                </View>

                {/* Title */}
                <Text style={styles.title}>Create Flashcards</Text>
                <Text style={styles.subtitle}>
                  {noteTitle
                    ? `Create flashcards from "${noteTitle}" to improve your retention skills`
                    : 'Create flashcards to improve your retention skills'}
                </Text>

                {/* Question Count Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>How many questions</Text>
                  <View style={styles.counterContainer}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={handleDecreaseQuestions}
                      activeOpacity={0.7}
                      disabled={isGenerating}
                    >
                      <Icon name="remove" size={24} color={theme.colors.grey[900]} />
                    </TouchableOpacity>
                    <View style={styles.counterValue}>
                      <Text style={styles.counterValueText}>
                        {questionCount}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={handleIncreaseQuestions}
                      activeOpacity={0.7}
                      disabled={isGenerating}
                    >
                      <Icon name="add" size={24} color={theme.colors.grey[900]} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Generate Button */}
                <TouchableOpacity
                  style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                  onPress={handleGenerate}
                  activeOpacity={0.8}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.generateButtonText}>Generate Flashcards</Text>
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
    backgroundColor: "rgba(2, 22, 39, 0.35)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.borderRadius['3xl'],
    borderTopRightRadius: theme.borderRadius['3xl'],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[6],
  },
  dragHandle: {
    width: 60,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[50],
    alignSelf: 'center',
    marginBottom: theme.spacing[3],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[3],
  },
  headerTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: "center",
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[4],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[5],
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
    textAlign: "center",
    marginBottom: theme.spacing[6],
  },
  selectorContainer: {
    width: "100%",
    backgroundColor: theme.colors.linen[100],
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing[6],
    marginBottom: theme.spacing[4],
  },
  selectorLabel: {
    ...theme.typography.textStyles.p2,
    fontWeight: '500',
    color: theme.colors.grey[900],
    textAlign: "center",
    marginBottom: theme.spacing[4],
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[6],
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.grey[100],
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    minWidth: 90,
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  counterValueText: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '600',
    color: theme.colors.grey[900],
  },
  generateButton: {
    width: "100%",
    backgroundColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    marginTop: theme.spacing[4],
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    ...theme.typography.textStyles.button2,
    color: "#FFFFFF",
  },
});
