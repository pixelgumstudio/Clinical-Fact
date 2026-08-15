import React from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@clinicalfact/design-system';

interface IntroSlideProps {
  image: ImageSourcePropType;
  headline: string;
  description: string;
  children?: React.ReactNode;
}

/**
 * Reusable full-bleed hero slide used by IntroScreen — takes an image and
 * headline/description text so the same visual treatment can be repeated
 * across multiple onboarding slides.
 */
export const IntroSlide = ({ image, headline, description, children }: IntroSlideProps) => {
  return (
    <View style={styles.container}>
      <Image source={image} style={styles.heroImage} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(2, 22, 39, 1)', 'rgba(2, 22, 39, 0.85)', 'rgba(2, 22, 39, 1)']}
        locations={[0, 0.08, 1]}
        style={styles.scrim}
      />

      <SafeAreaView style={styles.content} edges={['bottom']}>
        <View style={styles.textBlock}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.yale[900],
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing[5], // 20
    paddingBottom: theme.spacing[4], // 16
  },
  textBlock: {
    gap: theme.spacing[6], // 24
    marginBottom: theme.spacing[28], // 24
  },
  headline: {
    ...theme.typography.textStyles.h4,
    color: theme.colors.white,
  },
  description: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.white,
  },
});

export default IntroSlide;
