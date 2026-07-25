// apps/mobile/src/screens/auth/AuthScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@clinicfact/design-system';
import { colors, spacing, typography } from '@clinicfact/design-system';
import { useAuthStore } from '../../store/authStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

// Conditionally import GoogleSignin (not available in Expo Go)
let GoogleSignin: any = null;
let statusCodes: any = null;
try {
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  statusCodes = googleSigninModule.statusCodes;
} catch (e) {
  // Module not available (e.g., Expo Go or web)
}

type AuthScreenProps = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export const AuthScreen = ({ navigation }: AuthScreenProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  useEffect(() => {
    if (GoogleSignin) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
        scopes: ['profile', 'email'],
      });
    }
  }, []);

  const handleEmailAuth = () => {
    navigation.navigate('Email');
  };

  const handleGoogleAuth = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        t('common.info'),
        'Google Sign-in is only available in native builds. Please use email authentication or download the native app.'
      );
      return;
    }

    try {
      setIsLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type !== 'success') {
        // User cancelled or no credential
        return;
      }

      const idToken = response.data?.idToken;
      if (!idToken) {
        Alert.alert(t('common.error'), t('auth.errors.authTokenFailed'));
        return;
      }

      const { error } = await signInWithGoogle(idToken);
      if (error) {
        Alert.alert(t('auth.errors.signInFailed'), error.message || t('common.error'));
      }
    } catch (error: any) {
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — do nothing
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        // Sign-in already in progress
      } else {
        console.error('Google sign-in error:', error);
        Alert.alert(t('common.error'), t('auth.errors.googleSignInFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>Logo</Text>
            </View>
          </View>
          <Text style={[typography.styles.h2, styles.appName]}>
            ClinicFact
          </Text>
          <Text style={[typography.styles.body1, styles.tagline]}>
            {t('auth.welcomeScreen.tagline')}
          </Text>
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonSection}>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleEmailAuth}
            disabled={isLoading}
            style={styles.emailButton}
          >
            {t('auth.buttons.continueWithEmail')}
          </Button>

          <Button
            variant="secondary"
            size="large"
            fullWidth
            onPress={handleGoogleAuth}
            disabled={isLoading}
            style={styles.googleButton}
          >
            {isLoading ? t('auth.messages.signingIn') : t('auth.buttons.continueWithGoogle')}
          </Button>

          {/* Terms Text */}
          <Text style={[typography.styles.caption, styles.termsText]}>
            {t('auth.labels.byAgree')}{' '}
            <Text style={styles.linkText}>{t('auth.labels.termsAndConditions')}</Text>{' '}{t('auth.labels.and')}{' '}
            <Text style={styles.linkText}>{t('auth.labels.privacyPolicy')}</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing[6],
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: colors.neutral[900],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  logoText: {
    fontSize: typography.fontSize.base,
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
  },
  appName: {
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  tagline: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  buttonSection: {
    paddingBottom: spacing[8],
  },
  emailButton: {
    marginBottom: spacing[3],
  },
  googleButton: {
    marginBottom: spacing[6],
  },
  termsText: {
    textAlign: 'center',
    color: colors.text.secondary,
    paddingHorizontal: spacing[4],
  },
  linkText: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
});