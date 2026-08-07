import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, theme } from '@clinicalfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type IntroScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Intro'>;

/**
 * New hero/intro screen — confirmed 2026-07-29. Sits before the existing
 * Welcome (auth options) screen; "Get started" navigates there unchanged.
 */
export const IntroScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<IntroScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/splashScreenImage.png')}
        style={styles.heroImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(2, 26, 39, 0.85)', theme.colors.yale[900]]}
        locations={[0, 0.55, 1]}
        style={styles.scrim}
      />

      <SafeAreaView style={styles.content} edges={['bottom']}>
        <View style={styles.textBlock}>
          <Text style={styles.headline}>{t('auth.intro.headline')}</Text>
          <Text style={styles.description}>{t('auth.intro.description')}</Text>
        </View>

        <Button
          variant="light"
          fullWidth
          onPress={() => navigation.navigate('Welcome')}
        >
          {t('auth.getStarted')}
        </Button>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
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
    height: '55%',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing[5], // 20
    paddingBottom: theme.spacing[4], // 16
  },
  textBlock: {
    gap: theme.spacing[6], // 24
    marginBottom: theme.spacing[6], // 24
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

export default IntroScreen;
