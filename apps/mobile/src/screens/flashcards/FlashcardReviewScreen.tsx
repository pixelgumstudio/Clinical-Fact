import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon, theme } from '@clinicalfact/design-system';
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

const CARD_COLORS = [theme.colors.green[600], theme.colors.red[600], theme.colors.orange[600]];

export const FlashcardReviewScreen = () => {
  const navigation = useNavigation<FlashcardReviewNavigationProp>();
  const route = useRoute<FlashcardReviewRouteProp>();
  const { setId, title } = route.params || {};

  const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  // Elapsed review time — counts up from the moment the deck loads (no time limit for flashcards).
  useEffect(() => {
    if (isLoading) return;
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isLoading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.yale[700]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !flashcardSet || !flashcardSet.cards || flashcardSet.cards.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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

  const totalCards = flashcardSet.cards.length;
  const isDone = currentCardIndex >= totalCards;

  if (isDone) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.doneHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
            <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
          </TouchableOpacity>
        </View>
        <View style={styles.doneContent}>
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>All done</Text>
            <Text style={styles.doneSubtitle}>You have reviewed all the cards in this deck</Text>
          </View>
        </View>
        <View style={styles.doneFooter}>
          <TouchableOpacity style={styles.continueButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentCard = flashcardSet.cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / totalCards) * 100;
  const cardColor = CARD_COLORS[currentCardIndex % CARD_COLORS.length];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Question {currentCardIndex + 1}</Text>
        <View style={styles.timerBadge}>
          <Icon name="time" size={16} color={theme.colors.yale[700]} />
          <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>Question {currentCardIndex + 1} of {totalCards}</Text>
        <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress}%` as any }]} />
      </View>

      {/* Card */}
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
          <Icon name="backFill" size={20} color={theme.colors.grey[900]} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentCardIndex(currentCardIndex + 1)}
          style={styles.navButtonPrimary}
          activeOpacity={0.7}
        >
          <Icon name="foward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  headerBackButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.textStyles.p2,
    fontWeight: '500',
    color: theme.colors.grey[900],
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    gap: theme.spacing[1],
  },
  timerText: {
    ...theme.typography.textStyles.caption1,
    fontWeight: '500',
    color: theme.colors.yale[700],
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    marginTop: theme.spacing[3],
  },
  progressText: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[900],
  },
  progressPercentage: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[900],
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: theme.colors.grey[10],
    marginHorizontal: theme.spacing[5],
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[6],
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonPrimary: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.yale[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  errorText: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    backgroundColor: theme.colors.yale[700],
    borderRadius: theme.borderRadius.full,
  },
  retryButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
  doneHeader: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  doneContent: {
    flex: 1,
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[2],
  },
  doneCard: {
    backgroundColor: theme.colors.linen[50],
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    paddingVertical: theme.spacing[10],
    paddingHorizontal: theme.spacing[4],
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  doneTitle: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  doneSubtitle: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  doneFooter: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  continueButton: {
    backgroundColor: theme.colors.yale[700],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  continueButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
});
