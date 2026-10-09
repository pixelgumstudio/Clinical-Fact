import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon, theme, colors } from '@clinicalfact/design-system';
import api from '../../../services/api';
import { MainStackParamList } from '../../../navigation/MainStackNavigator';
import { formatRelativeTime } from '../../../utils/formatDate';

interface QuizAttemptRow {
  quizId: string;
  title: string;
  totalQuestions: number;
  createdAt: string;
  isCompleted: boolean;
  correctAnswers?: number;
}

interface FlashcardSetRow {
  setId: string;
  title: string;
  totalCards: number;
  masteredCards: number;
  createdAt: string;
}

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface ChatGeneratedContentSectionProps {
  chatSessionId: string;
}

const getFlashcardStatus = (set: FlashcardSetRow): string => {
  if (set.totalCards > 0 && set.masteredCards >= set.totalCards) return 'Mastered';
  if (set.masteredCards > 0) return `${set.masteredCards}/${set.totalCards} mastered`;
  return 'Not Started';
};

/** Lists the quizzes/flashcard sets generated from this specific chat session — tapping one
 *  resumes/reviews it. Backed by the same GET /quizzes/group and /flashcards/group?chatSessionId=
 *  endpoints QuizGroupDetailScreen/FlashcardGroupDetailScreen already use for the note-based
 *  equivalent of this list; renders nothing until at least one has been generated. */
export const ChatGeneratedContentSection: React.FC<ChatGeneratedContentSectionProps> = ({
  chatSessionId,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRow[]>([]);
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSetRow[]>([]);

  // Refetches every time this chat screen regains focus — covers generating a new quiz/
  // flashcard set (both navigate away to Quiz/FlashcardReview, then back here) and retaking
  // an existing quiz (score changes), without needing every generation call site to know
  // to notify this section.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [quizRes, flashcardRes] = await Promise.all([
          api.getQuizGroupDetail({ chatSessionId }),
          api.getFlashcardGroupDetail({ chatSessionId }),
        ]);
        if (cancelled) return;
        setQuizAttempts(quizRes.success && quizRes.data ? quizRes.data.attempts : []);
        setFlashcardSets(flashcardRes.success && flashcardRes.data ? flashcardRes.data.sets : []);
      })();
      return () => {
        cancelled = true;
      };
    }, [chatSessionId])
  );

  if (quizAttempts.length === 0 && flashcardSets.length === 0) return null;

  const handleSelectQuiz = (attempt: QuizAttemptRow) => {
    if (attempt.isCompleted) {
      navigation.navigate('QuizReview', { quizId: attempt.quizId, title: attempt.title, mode: 'review' });
    } else {
      navigation.navigate('Quiz', { quizId: attempt.quizId, noteTitle: attempt.title, timeInMinutes: 10 });
    }
  };

  const handleSelectFlashcardSet = (set: FlashcardSetRow) => {
    navigation.navigate('FlashcardReview', { setId: set.setId, title: set.title });
  };

  return (
    <View style={styles.container}>
      {quizAttempts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quiz generation</Text>
          {quizAttempts.map((attempt) => {
            const passed = (attempt.correctAnswers ?? 0) / attempt.totalQuestions >= 0.5;
            return (
              <TouchableOpacity
                key={attempt.quizId}
                style={styles.card}
                onPress={() => handleSelectQuiz(attempt)}
                activeOpacity={0.7}
              >
                <View style={styles.iconBadge}>
                  <Icon name="quizFill" size={20} color={theme.colors.yale[700]} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{attempt.title}</Text>
                  <Text style={styles.cardSubtitle}>
                    {attempt.totalQuestions} questions ·{' '}
                    {attempt.isCompleted ? (
                      <Text style={passed ? styles.scorePass : styles.scoreFail}>
                        Score {attempt.correctAnswers ?? 0}/{attempt.totalQuestions}
                      </Text>
                    ) : (
                      'Not Started'
                    )}
                  </Text>
                </View>
                <Text style={styles.cardTime}>{formatRelativeTime(attempt.createdAt)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {flashcardSets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Flashcards generation</Text>
          {flashcardSets.map((set) => (
            <TouchableOpacity
              key={set.setId}
              style={styles.card}
              onPress={() => handleSelectFlashcardSet(set)}
              activeOpacity={0.7}
            >
              <View style={styles.iconBadge}>
                <Icon name="flashcardsFill" size={20} color={theme.colors.yale[700]} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{set.title}</Text>
                <Text style={styles.cardSubtitle}>{set.totalCards} questions · {getFlashcardStatus(set)}</Text>
              </View>
              <Text style={styles.cardTime}>{formatRelativeTime(set.createdAt)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing[6], // 24
    marginTop: theme.spacing[6], // 24
  },
  section: {
    gap: theme.spacing[3], // 12
  },
  sectionLabel: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderRadius: theme.borderRadius.input, // 16
    padding: theme.spacing[3], // 12
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.linen[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  cardSubtitle: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[400],
  },
  scorePass: {
    color: theme.colors.green[600], // matches QuizReviewScreen's "correct" green
  },
  scoreFail: {
    color: colors.error.main,
  },
  cardTime: {
    ...theme.typography.textStyles.caption1,
    color: theme.colors.grey[400],
  },
});
