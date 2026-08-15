import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, theme } from '@clinicalfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { IntroSlide } from './components/IntroSlide';

type IntroScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Intro'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'slide1',
    image: require('../../../assets/splashScreenImage.png'),
    headlineKey: 'auth.intro.slide1.headline',
    descriptionKey: 'auth.intro.slide1.description',
  },
  {
    key: 'slide2',
    image: require('../../../assets/splashScreenImage2.png'),
    headlineKey: 'auth.intro.slide2.headline',
    descriptionKey: 'auth.intro.slide2.description',
  },
  {
    key: 'slide3',
    image: require('../../../assets/splashScreenImage3.png'),
    headlineKey: 'auth.intro.slide3.headline',
    descriptionKey: 'auth.intro.slide3.description',
  },
];

/**
 * New hero/intro screen — confirmed 2026-07-29. Sits before the existing
 * Welcome (auth options) screen; "Get started" navigates there unchanged.
 * Extended 2026-08-11 to a swipeable 3-slide pager. The dots + CTA are
 * rendered once as a fixed overlay (not per-slide) so they stay put while
 * the background swipes underneath — only the CTA's label changes, to
 * "Get started" on the final slide.
 */
export const IntroScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<IntroScreenNavigationProp>();
  const flatListRef = useRef<FlatList>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLastSlide = slideIndex === SLIDES.length - 1;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setSlideIndex(index);
  }, []);

  const handlePress = () => {
    if (isLastSlide) {
      navigation.navigate('Welcome');
    } else {
      const nextIndex = slideIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setSlideIndex(nextIndex);
    }
  };

  return (
    <View style={styles.container}>
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
          <View style={styles.page}>
            <IntroSlide
              image={item.image}
              headline={t(item.headlineKey)}
              description={t(item.descriptionKey)}
            />
          </View>
        )}
      />

      <SafeAreaView style={styles.footer} edges={['bottom']} pointerEvents="box-none">
        <View style={styles.dots} pointerEvents="none">
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
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return <Animated.View key={i} style={[styles.dot, { width, opacity }]} />;
          })}
        </View>

        <Button variant="light" fullWidth onPress={handlePress}>
          {isLastSlide ? t('auth.getStarted') : t('common.next')}
        </Button>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: theme.spacing[4], // 16
    paddingHorizontal: theme.spacing[5], // 20
    paddingBottom: theme.spacing[4], // 16
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
  },
  dot: {
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
  },
});

export default IntroScreen;
