/**
 * FILE: /mnt/project/packages/design-system/src/components/QuizCard.tsx
 * 
 * QuizCard Component
 * 
 * A card component for displaying quiz items in lists.
 * Shows quiz title, question count, time limit, and score.
 * 
 * @example
 * ```tsx
 * <QuizCard
 *   quiz={{
 *     id: '1',
 *     name: 'Biology Quiz',
 *     questionCount: 10,
 *     timeLimit: 15,
 *     lastScore: 85,
 *     createdAt: new Date(),
 *   }}
 *   onPress={() => navigation.navigate('TakeQuiz', { id: '1' })}
 * />
 * ```
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { theme } from '../theme';

export interface Quiz {
  id: string;
  name: string;
  questionCount: number;
  timeLimit?: number; // in minutes
  lastScore?: number; // percentage
  lastAttemptDate?: Date;
  createdAt: Date;
}

export interface QuizCardProps {
  /**
   * Quiz data
   */
  quiz: Quiz;

  /**
   * Press handler
   */
  onPress?: () => void;

  /**
   * View results handler
   */
  onViewResults?: () => void;

  /**
   * More options handler
   */
  onMore?: () => void;

  /**
   * Container style
   */
  style?: ViewStyle;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  onPress,
  onViewResults,
  onMore,
  style,
}) => {
  const getGradeColor = (score: number): string => {
    if (score >= 90) return theme.colors.success.main;
    if (score >= 70) return theme.colors.info.main;
    if (score >= 50) return theme.colors.warning.main;
    return theme.colors.error.main;
  };

  const getGradeLetter = (score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    if (score >= 50) return 'E';
    return 'F';
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const hasScore = quiz.lastScore !== undefined;
  const gradeColor = hasScore ? getGradeColor(quiz.lastScore!) : theme.colors.text.tertiary;
  const gradeLetter = hasScore ? getGradeLetter(quiz.lastScore!) : '-';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Quiz Icon */}
        <View style={styles.iconContainer}>
          <Icon name="help-circle" size={24} color={theme.colors.primary[500]} />
        </View>

        {/* Title and Date */}
        <View style={styles.info}>
          <Text variant="body1" weight="semibold" numberOfLines={1}>
            {quiz.name}
          </Text>
          <Text variant="caption" color="tertiary" style={styles.date}>
            Created {formatDate(quiz.createdAt)}
          </Text>
        </View>

        {/* Grade Badge */}
        <View style={[styles.gradeBadge, { backgroundColor: `${gradeColor}20` }]}>
          <Text
            variant="h5"
            weight="bold"
            style={{ color: gradeColor }}
          >
            {gradeLetter}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Icon name="list" size={16} color={theme.colors.text.tertiary} />
          <Text variant="caption" color="tertiary" style={styles.statText}>
            {quiz.questionCount} questions
          </Text>
        </View>

        {quiz.timeLimit && (
          <View style={styles.stat}>
            <Icon name="clock" size={16} color={theme.colors.text.tertiary} />
            <Text variant="caption" color="tertiary" style={styles.statText}>
              {quiz.timeLimit} min
            </Text>
          </View>
        )}

        {hasScore && (
          <View style={styles.stat}>
            <Icon name="target" size={16} color={theme.colors.text.tertiary} />
            <Text variant="caption" color="tertiary" style={styles.statText}>
              {quiz.lastScore}% score
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          style={styles.primaryButton}
        >
          <Icon
            name={hasScore ? 'refresh-cw' : 'play'}
            size={16}
            color={theme.colors.primary[500]}
          />
          <Text
            variant="body2"
            weight="semibold"
            style={{ ...styles.buttonText, color: theme.colors.primary[500] }}
          >
            {hasScore ? 'Retake' : 'Start Quiz'}
          </Text>
        </TouchableOpacity>

        {hasScore && onViewResults && (
          <TouchableOpacity
            onPress={onViewResults}
            activeOpacity={0.7}
            style={styles.secondaryButton}
          >
            <Icon name="bar-chart-2" size={16} color={theme.colors.text.secondary} />
            <Text variant="caption" color="secondary" style={styles.buttonText}>
              Results
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onMore}
          activeOpacity={0.7}
          style={styles.moreButton}
        >
          <Icon name="more-horizontal" size={18} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary[500]}15`,
    marginRight: theme.spacing[3],
  },

  info: {
    flex: 1,
  },

  date: {
    marginTop: theme.spacing[1],
  },

  gradeBadge: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing[2],
  },

  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing[3],
    gap: theme.spacing[3],
  },

  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statText: {
    marginLeft: theme.spacing[1],
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[4],
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: `${theme.colors.primary[500]}10`,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing[2],
  },

  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
  },

  moreButton: {
    marginLeft: 'auto',
    padding: theme.spacing[2],
  },

  buttonText: {
    marginLeft: theme.spacing[1],
  },
});

export default QuizCard;