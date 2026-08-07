import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { theme } from '@clinicalfact/design-system';

export interface IFlashcard {
  id: string;
  front: string;
  back: string;
  color?: string;
}

interface FlashcardCardProps {
  card: IFlashcard | null;
  isFlipped: boolean;
  onFlip: () => void;
  isLoading?: boolean;
  cardColor?: string;
}

export const FlashcardCard: React.FC<FlashcardCardProps> = ({
  card,
  isFlipped,
  onFlip,
  isLoading = false,
  cardColor = theme.colors.green[600],
}) => {
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 180 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isFlipped]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 90, 180],
    outputRange: [1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 90, 180],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <View style={styles.cardWrapper}>
          {isLoading ? (
            <View style={[styles.flashcard, { backgroundColor: cardColor }]}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : !card ? (
            <View style={[styles.flashcard, { backgroundColor: cardColor }]}>
              <Text style={styles.cardText}>No content available</Text>
            </View>
          ) : (
            <>
              {/* Front */}
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={onFlip}
                style={styles.cardTouchable}
              >
                <Animated.View
                  style={[
                    styles.flashcard,
                    { backgroundColor: cardColor },
                    {
                      transform: [{ rotateY: frontInterpolate }],
                      opacity: frontOpacity,
                    },
                  ]}
                >
                  <ScrollView
                    style={styles.cardScrollView}
                    contentContainerStyle={styles.cardTextContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.cardText}>{card.front}</Text>
                  </ScrollView>
                  <View style={styles.flipButton}>
                    <Text style={styles.flipButtonText}>click card to flip</Text>
                  </View>
                </Animated.View>
              </TouchableOpacity>

              {/* Back */}
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={onFlip}
                style={styles.cardTouchable}
              >
                <Animated.View
                  style={[
                    styles.flashcard,
                    styles.flashcardBack,
                    { backgroundColor: cardColor },
                    {
                      transform: [{ rotateY: backInterpolate }],
                      opacity: backOpacity,
                    },
                  ]}
                >
                  <ScrollView
                    style={styles.cardScrollView}
                    contentContainerStyle={styles.cardTextContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.cardText}>{card.back}</Text>
                  </ScrollView>
                  <View style={styles.flipButton}>
                    <Text style={styles.flipButtonText}>click card to flip</Text>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing[5],
  },
  cardWrapper: {
    position: 'relative',
    flex: 1,
    marginBottom: theme.spacing[6],
  },
  cardTouchable: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  flashcard: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[8],
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  flashcardBack: {
    position: 'absolute',
  },
  cardScrollView: {
    flex: 1,
  },
  cardTextContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
  },
  cardText: {
    ...theme.typography.textStyles.h7,
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
  },
  flipButton: {
    alignSelf: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  flipButtonText: {
    ...theme.typography.textStyles.button2,
    color: '#FFFFFF',
  },
});
