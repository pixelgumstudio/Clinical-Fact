import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type FeatureShowcaseNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'FeatureShowcase'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'transcribe',
    title: 'Auto-transcribe any videos or file',
    description:
      'Record a lecture, upload a PDF, or drop a YouTube link—Clinical Fact will automatically transcribe and summarize it for you.',
    badge: 'NEW',
    illustration: 'transcribe',
  },
  {
    key: 'chat',
    title: 'Chat with your notes',
    description:
      'Ask questions about your notes and get instant AI-powered answers. Study smarter, not harder.',
    badge: null,
    illustration: 'chat',
  },
  {
    key: 'quiz',
    title: 'Learn concepts better. Flashcards!',
    description:
      'Automatically generate quizzes and flashcards from your notes. Track your progress and master any subject.',
    badge: null,
    illustration: 'quiz',
  },
];

const TranscribeIllustration = () => (
  <View style={styles.illustration}>
    <View style={styles.fileCard}>
      <View style={styles.fileIcon}>
        <Text style={styles.fileEmoji}>🎵</Text>
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName}>lecture_audio.mp3</Text>
        <Text style={styles.fileSize}>12.4 MB</Text>
      </View>
    </View>
    <Text style={styles.arrowIcon}>↓</Text>
    <View style={styles.notesPreview}>
      <View style={styles.noteLine} />
      <View style={[styles.noteLine, { width: '80%' }]} />
      <View style={[styles.noteLine, { width: '60%' }]} />
    </View>
  </View>
);

const ChatIllustration = () => (
  <View style={styles.illustration}>
    <View style={styles.chatContainer}>
      <View style={[styles.chatBubble, styles.userBubble]}>
        <Text style={styles.userBubbleText}>
          What are the key points from my biology notes?
        </Text>
      </View>
      <View style={[styles.chatBubble, styles.aiBubble]}>
        <Text style={styles.aiBubbleText}>
          {'Based on your notes, the key points are:\n1. Cell structure and function\n2. DNA replication process\n3. Protein synthesis...'}
        </Text>
      </View>
    </View>
  </View>
);

const QuizIllustration = () => (
  <View style={styles.illustration}>
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>3/6</Text>
        <Text style={styles.statLabel}>Questions</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>80%</Text>
        <Text style={styles.statLabel}>Accuracy</Text>
      </View>
    </View>
    <View style={styles.flashcard}>
      <Text style={styles.flashcardLabel}>FLASHCARD</Text>
      <Text style={styles.flashcardQuestion}>
        What is the primary function of mitochondria?
      </Text>
    </View>
  </View>
);

const illustrations: Record<string, React.ReactElement> = {
  transcribe: <TranscribeIllustration />,
  chat: <ChatIllustration />,
  quiz: <QuizIllustration />,
};

export const FeatureShowcaseScreen = () => {
  const navigation = useNavigation<FeatureShowcaseNavigationProp>();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setActiveIndex(index);
    },
    []
  );

  const handleContinue = () => {
    if (activeIndex < SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } else {
      navigation.navigate('Thanks');
    }
  };

  const handleBack = () => {
    if (activeIndex > 0) {
      const prevIndex = activeIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      setActiveIndex(prevIndex);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      {/* Pager */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              {illustrations[item.illustration] as any}
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              {item.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : null}
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDescription}>{item.description}</Text>
            </View>
          </View>
        )}
      />

      {/* Dot indicator */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, i) => {
          const inputRange = [
            (i - 1) * SCREEN_WIDTH,
            i * SCREEN_WIDTH,
            (i + 1) * SCREEN_WIDTH,
          ];
          const width = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[styles.dot, { width, opacity }]} />
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>
            {activeIndex === SLIDES.length - 1 ? 'Continue' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#1C1C1C',
    fontWeight: '400',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 24,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: '100%',
    padding: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    alignItems: 'center',
  },
  // Transcribe
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  fileIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#FFE4E6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileEmoji: {
    fontSize: 24,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1C',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#636363',
  },
  arrowIcon: {
    fontSize: 28,
    color: '#1C1C1C',
    marginVertical: 8,
  },
  notesPreview: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  noteLine: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginBottom: 8,
    width: '100%',
  },
  // Chat
  chatContainer: {
    width: '100%',
    gap: 12,
  },
  chatBubble: {
    padding: 14,
    borderRadius: 16,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#1C1C1C',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubbleText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  aiBubbleText: {
    fontSize: 14,
    color: '#1C1C1C',
    lineHeight: 20,
  },
  // Quiz
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    width: '100%',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#636363',
  },
  flashcard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  flashcardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636363',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  flashcardQuestion: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1C',
    lineHeight: 22,
  },
  // Description
  descriptionSection: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 24,
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1C',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.44,
    lineHeight: 30,
  },
  featureDescription: {
    fontSize: 15,
    color: '#636363',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  // Dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1C1C1C',
  },
  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.16,
  },
});
