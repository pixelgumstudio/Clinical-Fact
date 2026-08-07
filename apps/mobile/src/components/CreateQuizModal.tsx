import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Icon, theme } from "@clinicalfact/design-system";
import { useSubscriptionStore } from '../store/subscriptionStore';
import { showInAppPaywall } from '../services/revenuecat';

// 🚧 TEMP: Pro paywall gate on quiz generation is disabled for testing.
// Set back to true before shipping to production.
const QUIZ_PAYWALL_ENABLED = false;

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
    if (QUIZ_PAYWALL_ENABLED && !hasAccess) {
      console.log('Shield triggered: Free user trying to create quiz.');
      const count = questionCount;
      const minutes = timeMinutes;
      onClose(); // Close the Quiz Modal first

      setTimeout(async () => {
        try {
          const unlocked = await showInAppPaywall();
          // Only proceed once the user actually has access (purchased/restored/already entitled) —
          // previously this branch closed the modal and never called onGenerateQuiz at all, even
          // on a successful purchase.
          if (unlocked) {
            onGenerateQuiz(count, minutes);
          }
        } catch (error) {
          console.error('Paywall failed to open:', error);
        }
      }, 600);

      return; // 🛑 Stop the function so onGenerateQuiz is never called synchronously
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
              <View style={styles.dragHandle} />

              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Icon name="close" size={20} color={theme.colors.grey[900]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Generate Quiz
                </Text>
                <View style={styles.closeButton} />
              </View>

              {/* Content */}
              <View style={styles.content}>
                {/* Quiz Icon */}
                <View style={styles.iconCircle}>
                  <Icon name="quizFill" size={40} color="#FFFFFF" />
                </View>

                {/* Title */}
                <Text style={styles.title}>Create Quiz</Text>
                <Text style={styles.subtitle}>
                  {noteTitle
                    ? `Practice "${noteTitle}" by creating questions that help you master the topic`
                    : 'Practice your notes by creating questions that help you master the topic'}
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
                    >
                      <Icon name="add" size={24} color={theme.colors.grey[900]} />
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
                      <Icon name="remove" size={24} color={theme.colors.grey[900]} />
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
                      <Icon name="add" size={24} color={theme.colors.grey[900]} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Generate Button */}
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGenerate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.generateButtonText}>Generate Quiz</Text>
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
  generateButtonText: {
    ...theme.typography.textStyles.button2,
    color: "#FFFFFF",
  },
});
