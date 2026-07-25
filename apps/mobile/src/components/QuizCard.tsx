import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography } from '@clinicfact/design-system';

export interface IQuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: string;
}

interface QuizCardProps {
  question: IQuizQuestion | null;
  userAnswer: string | number | undefined;
  isLoading?: boolean;
  showExplanation?: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#D1FAE5',
  medium: '#FEF3C7',
  hard: '#FEE2E2',
};

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  userAnswer,
  isLoading = false,
  showExplanation = true,
}) => {
  if (isLoading) {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={colors.text.primary} />
        </View>
      </View>
    );
  }

  if (!question) {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Text style={styles.cardText}>No content available</Text>
        </View>
      </View>
    );
  }

  const bgColor = DIFFICULTY_COLORS[question.difficulty] || DIFFICULTY_COLORS.medium;
  const isCorrect = String(userAnswer) === String(question.correctAnswer);

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.card, { backgroundColor: bgColor }]}>
        {/* Question */}
        <Text style={styles.questionText}>{question.questionText}</Text>

        {/* Difficulty Badge */}
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{question.difficulty}</Text>
        </View>

        {/* Answer Status */}
        {userAnswer !== undefined && (
          <View style={[styles.answerStatus, { backgroundColor: isCorrect ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.answerStatusText, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </Text>
          </View>
        )}

        {/* Explanation */}
        {showExplanation && question.explanation && (
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationLabel}>Explanation</Text>
            <Text style={styles.explanationText}>{question.explanation}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  card: {
    borderRadius: 20,
    padding: spacing[6],
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  questionText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing[4],
    color: '#1F2937',
    lineHeight: 28,
  },
  difficultyBadge: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    backgroundColor: 'rgba(31, 41, 55, 0.1)',
    borderRadius: 8,
    marginBottom: spacing[3],
  },
  difficultyText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  answerStatus: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: 8,
    marginVertical: spacing[3],
  },
  answerStatusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  explanationContainer: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(31, 41, 55, 0.2)',
  },
  explanationLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: '#1F2937',
    marginBottom: spacing[2],
  },
  explanationText: {
    fontSize: typography.fontSize.sm,
    color: '#1F2937',
    lineHeight: 20,
  },
  cardText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
});
