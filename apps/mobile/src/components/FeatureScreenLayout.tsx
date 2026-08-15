import React from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Icon, theme } from '@clinicalfact/design-system';

export interface FeatureScreenLayoutProps {
  title: string;
  subtitle: string;
  continueLabel: string;
  onContinue: () => void;
  /** Screenshot/mockup image rendered centered above the title. Takes priority over `children`. */
  image?: ImageSourcePropType;
  /** The screen-specific illustration/demo content, rendered above the title. Ignored if `image` is set. */
  children?: React.ReactNode;
}

/**
 * Shared chrome for the post-survey feature showcase (Feature1 → Feature2 →
 * Feature3 → Feature4). Each screen supplies its own illustration, either as
 * a full-width `image` (screenshot/mockup) or custom `children`; the
 * floating back button, title/subtitle block, and Continue button stay
 * identical across all screens.
 */
export const FeatureScreenLayout: React.FC<FeatureScreenLayoutProps> = ({
  title,
  subtitle,
  continueLabel,
  onContinue,
  image,
  children,
}) => {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {image ? (
          <Image source={image} style={styles.image} resizeMode="contain" />
        ) : (
          children
        )}

        <View style={styles.titleSection}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </ScrollView>

      <Pressable
        onPress={() => navigation.canGoBack() && navigation.goBack()}
        style={styles.backButton}
      >
        <Icon name="backFill" size={24} color="#7F8783" />
      </Pressable>

      <View style={styles.footer}>
        <Button variant="primary" fullWidth onPress={onContinue}>
          {continueLabel}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
    header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[4], // 32
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing[16], // 8
    left: theme.spacing[4], // 16
    zIndex: 10,
    elevation: 10,
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing[4],
  },
  image: {
    alignSelf: 'center',
    width: '100%',
    aspectRatio: 393 / 850,
  },
  titleSection: {
     position: 'absolute',
    //  backgroundColor: theme.colors.white,
    bottom: theme.spacing[32], // 8
    gap: theme.spacing[2], // 8
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[8], // 24
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[0], // 8
  },
});

export default FeatureScreenLayout;
