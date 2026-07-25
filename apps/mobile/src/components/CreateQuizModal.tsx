import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import {
  colors,
  spacing,
  typography,
  CloseIcon,
  QuizCardIcon,
  MinusIcon,
  PlusIcon,
} from "@clinicfact/design-system";
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAuthStore } from '../store/authStore';
import { showInAppPaywall } from '../services/revenuecat';

interface CreateQuizModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerateQuiz: (questionCount: number, timeInMinutes: number) => void;
  noteTitle?: string;
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  visible,
  onClose,
  onGenerateQuiz,
  noteTitle,
}) => {
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);
  const user = useAuthStore((s) => s.user);
  const [questionCount, setQuestionCount] = useState(3);
  const [timeMinutes, setTimeMinutes] = useState(10);
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

  const handleDecreaseTime = () => {
    if (timeMinutes > 1) {
      setTimeMinutes(timeMinutes - 1);
    }
  };

  const handleIncreaseTime = () => {
    if (timeMinutes < 120) {
      setTimeMinutes(timeMinutes + 1);
    }
  };

  const formatTime = (minutes: number) => {
    const mins = String(minutes).padStart(2, "0");
    return `00:${mins}`;
  };

const handleGenerate = async () => {
    // 🛡️ NUCLEAR OPTION: If they aren't Pro, trigger the paywall immediately
    // Use the 600ms timeout to avoid the modal collision bug
    if (!hasAccess) {
      console.log('Shield triggered: Free user trying to create quiz.');
      onClose(); // Close the Quiz Modal first
      
      setTimeout(async () => {
        try {
          await showInAppPaywall();
        } catch (error) {
          console.error('Paywall failed to open:', error);
        }
      }, 600);
      
      return; // 🛑 Stop the function so onGenerateQuiz is never called
    }

    // Normal flow for Pro users
    onGenerateQuiz(questionCount, timeMinutes);
    onClose();
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
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {noteTitle
                    ? `${noteTitle.substring(0, 20)}...`
                    : "Create Quiz"}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CloseIcon size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.content}>
                {/* Quiz Icon */}
                <View style={styles.iconContainer}>
                  <QuizCardIcon size={64} />
                </View>

                {/* Title */}
                <Text style={styles.title}>Create Quiz</Text>
                <Text style={styles.subtitle}>
                  Practice your notes by creating questions that help{"\n"}you
                  master the topic
                </Text>

                {/* Question Count Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>How many questions</Text>
                  <View style={styles.counterContainer}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={handleDecreaseQuestions}
                      activeOpacity={0.7}
                    >
                      <MinusIcon size={20} color="#6B7280" />
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
                    >
                      <PlusIcon size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Time Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>Time (in minutes)</Text>
                  <View style={styles.counterContainer}>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={handleDecreaseTime}
                      activeOpacity={0.7}
                    >
                      <MinusIcon size={20} color="#6B7280" />
                    </TouchableOpacity>
                    <View style={styles.counterValue}>
                      <Text style={styles.counterValueText}>
                        {formatTime(timeMinutes)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.counterButton}
                      onPress={handleIncreaseTime}
                      activeOpacity={0.7}
                    >
                      <PlusIcon size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Generate Button */}
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGenerate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.generateButtonText}>Generate quiz</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    alignItems: "center",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  iconContainer: {
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  selectorContainer: {
    width: "100%",
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  selectorLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing[3],
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    minWidth: 80,
    paddingHorizontal: spacing[4],
    justifyContent: "center",
    alignItems: "center",
  },
  counterValueText: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  generateButton: {
    width: "100%",
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[4],
    borderRadius: 100,
    alignItems: "center",
    marginTop: spacing[4],
  },
  generateButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
});
