import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';

const SLIDES_CONFIG = [
  {
    id: '1',
    label: 'Capture anything',
    title: (name?: string) => name ? `Welcome,\n${name}` : 'Welcome to\nClinicFact',
    description: 'Turn audio, videos, PDFs, and images into\nclear, structured notes in seconds.',
    gradient: ['#CEF9D0', '#DCF0B5', '#FFD6C8'] as [string, string, string],
    icon: '📝',
  },
  {
    id: '2',
    label: 'Smart organisation',
    title: () => 'Keep everything\norganised',
    description: 'Create folders, tag notes, and find anything\ninstantly with powerful search.',
    gradient: ['#DBEAFE', '#EDE9FE', '#FCE7F3'] as [string, string, string],
    icon: '📁',
  },
  {
    id: '3',
    label: 'AI powered quizzes',
    title: () => 'Learn faster\nwith AI',
    description: 'Auto-generate quizzes, flashcards and\nsummaries directly from your notes.',
    gradient: ['#FEF9C3', '#FEF3C7', '#FFE4E6'] as [string, string, string],
    icon: '🎯',
  },
  {
    id: '4',
    label: "You're all set",
    title: () => "You're ready\nto go",
    description: "Start creating notes and let ClinicFact\ndo the heavy lifting for you.",
    gradient: ['#F0FDF4', '#DCFCE7', '#D1FAE5'] as [string, string, string],
    icon: '🚀',
  },
];

export const OnboardingScreen = () => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const { setOnboardingComplete } = useOnboardingStore();
  const { user } = useAuthStore();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const firstName = user?.name?.split(' ')[0] || (user as any)?.firstName;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index || 0);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleNext = async () => {
    if (currentIndex < SLIDES_CONFIG.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    try {
      await setOnboardingComplete();
    } catch {
      setIsCompleting(false);
    }
  };

  const renderSlide = ({ item }: { item: typeof SLIDES_CONFIG[0] }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      {/* Illustration card */}
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.illustrationCard}
      >
        <Text style={styles.illustrationIcon}>{item.icon}</Text>
      </LinearGradient>

      {/* Text content */}
      <View style={styles.textContent}>
        <View style={styles.labelPill}>
          <Text style={styles.labelText}>{item.label}</Text>
        </View>
        <Text style={styles.slideTitle}>{item.title(firstName)}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    </View>
  );

  const isLastSlide = currentIndex === SLIDES_CONFIG.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header: Skip */}
      <View style={styles.header}>
        {!isLastSlide ? (
          <TouchableOpacity onPress={handleComplete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES_CONFIG}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 500);
        }}
        style={styles.list}
      />

      {/* Footer: dots + button */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES_CONFIG.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, isCompleting && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isCompleting}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get started' : 'Next'}
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 44,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8B8B8B',
    letterSpacing: -0.15,
  },
  list: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  illustrationCard: {
    borderRadius: 28,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
  },
  illustrationIcon: {
    fontSize: 80,
  },
  textContent: {
    gap: 12,
  },
  labelPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B8B8B',
    letterSpacing: -0.12,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1C1C1C',
    lineHeight: 38,
    letterSpacing: -0.64,
  },
  slideDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: '#636363',
    lineHeight: 24,
    letterSpacing: -0.32,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#1C1C1C',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#D7D7D7',
  },
  nextButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.16,
  },
});
