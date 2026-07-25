import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, ChevronLeftIcon, ChevronRightIcon } from '@clinicfact/design-system';
import { MainStackParamList } from '../../navigation/MainStackNavigator';
import { FlashcardCard, IFlashcard } from '../../components/FlashcardCard';
import api from '../../services/api';

type FlashcardReviewRouteProp = RouteProp<MainStackParamList, 'FlashcardReview'>;
type FlashcardReviewNavigationProp = NativeStackNavigationProp<MainStackParamList, 'FlashcardReview'>;

interface FlashcardSet {
  id: string;
  _id?: string;
  title: string;
  cards: IFlashcard[];
}

const CARD_COLORS = [
  '#FFD1B8', // Peach
  '#B8E0D8', // Mint
  '#FFE0A8', // Light Orange
  '#C8E0B8', // Light Green
  '#FFB3BA', // Pink
  '#BAE1FF', // Light Blue
  '#FFFFBA', // Light Yellow
];

export const FlashcardReviewScreen = () => {
  const navigation = useNavigation<FlashcardReviewNavigationProp>();
  const route = useRoute<FlashcardReviewRouteProp>();
  const { setId, title } = route.params || {};

  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlashcardSet = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!setId) {
          setError('No flashcard set ID provided');
          return;
        }

        const response = await api.getFlashcardSet(setId);

        if (response.success && response.data) {
          const rawCards = response.data.cards || response.data.flashcards || [];

          // Map API response to IFlashcard interface (front/back properties)
          const mappedCards: IFlashcard[] = rawCards.map((card: any) => ({
            id: card.id || card._id || '',
            front: card.front || card.question || '',
            back: card.back || card.answer || '',
            color: card.color,
          }));

          setFlashcardSet({
            id: response.data.id || response.data._id,
            _id: response.data._id,
            title: response.data.title || title || 'Flashcards',
            cards: mappedCards,
          });
        } else {
          setError('Failed to load flashcard set');
        }
      } catch (err) {
        console.error('Error fetching flashcard set:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlashcardSet();
  }, [setId, title]);

  useEffect(() => {
    setIsFlipped(false);
  }, [currentCardIndex]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading flashcards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !flashcardSet || !flashcardSet.cards || flashcardSet.cards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            {error || 'No flashcards in this set'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentCard = flashcardSet.cards[currentCardIndex];
  const totalCards = flashcardSet.cards.length;
  const percentage = Math.round(((currentCardIndex + 1) / totalCards) * 100);
  const cardColor = CARD_COLORS[currentCardIndex % CARD_COLORS.length];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {flashcardSet.title}
        </Text>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Flashcard {currentCardIndex + 1} of {totalCards}
        </Text>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={['#F9C597', '#FFB09C', '#EBE19F', '#CEF9D0'] as any}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.progressBarFill, { width: `${percentage}%` as any }]}
          />
        </View>
        <Text style={styles.progressPercent}>{percentage}%</Text>
      </View>

      {/* Use Reusable Card Component */}
      <FlashcardCard
        card={currentCard}
        isFlipped={isFlipped}
        onFlip={() => setIsFlipped(!isFlipped)}
        cardColor={cardColor}
        isLoading={isLoading}
      />

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          disabled={currentCardIndex === 0}
          onPress={() => setCurrentCardIndex(currentCardIndex - 1)}
          style={[
            styles.navButton,
            currentCardIndex === 0 && styles.navButtonDisabled,
          ]}
          activeOpacity={0.7}
        >
          <ChevronLeftIcon
            size={24}
            color={currentCardIndex === 0 ? '#6B7280' : '#FFFFFF'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={currentCardIndex === totalCards - 1}
          onPress={() => setCurrentCardIndex(currentCardIndex + 1)}
          style={[
            styles.navButton,
            currentCardIndex === totalCards - 1 && styles.navButtonDisabled,
          ]}
          activeOpacity={0.7}
        >
          <ChevronRightIcon
            size={24}
            color={currentCardIndex === totalCards - 1 ? '#6B7280' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>

      {/* Back Button */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backArrow: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginHorizontal: spacing[3],
    textAlign: 'center',
  },
  percentage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.semibold,
  },
  progressContainer: {
    paddingHorizontal: spacing[5],
    marginBottom: spacing[6],
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F9F9F9',
    borderRadius: 3,
    marginBottom: spacing[2],
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[6],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  loadingText: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.primary[500],
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  backButtonContainer: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  backButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.neutral[200],
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
});
