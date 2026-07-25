import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

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
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore } from '../../store/signupStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

import {
  EmailIcon,
  AuthIcon1,
  AuthIcon2,
  AuthIcon3,
  AuthIcon4,
  AuthIcon5,
  AuthIcon6,
  AuthIcon7,
  AuthIcon8,
} from '@clinicfact/design-system';

const GOOGLE_EXPO_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

WebBrowser.maybeCompleteAuthSession();

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { setAuthMethod, setGoogleUserData, isGoogleLoading, setGoogleLoading, setError } = useSignupStore();
  const { setAuthState, signInWithApple } = useAuthStore();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [isAppleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
    if (Platform.OS === 'android' && GoogleSignin) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
        scopes: ['profile', 'email'],
      });
    }
  }, []);

  const hasRequiredClientId = Platform.select({
    android: !!GOOGLE_ANDROID_CLIENT_ID,
    ios: !!GOOGLE_IOS_CLIENT_ID,
    default: !!GOOGLE_EXPO_CLIENT_ID || !!GOOGLE_WEB_CLIENT_ID,
  }) ?? false;

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_EXPO_CLIENT_ID || 'not-configured',
    iosClientId: GOOGLE_IOS_CLIENT_ID || 'not-configured',
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || 'not-configured',
    webClientId: GOOGLE_WEB_CLIENT_ID || 'not-configured',
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (request) {
      console.log('=== GOOGLE OAUTH DEBUG ===');
      console.log('Redirect URI:', request.redirectUri);
      console.log('Platform:', Platform.OS);
      console.log('========================');
    }
  }, [request]);

  useEffect(() => {
    if (!response) return;

    console.log('Google OAuth response:', response.type);

    if (response.type === 'success') {
      const accessToken = response.params?.access_token;
      if (accessToken) {
        fetchAndHandleGoogleToken(accessToken, undefined);
      } else {
        setGoogleLoading(false);
        setError('Failed to get access token from Google');
        Alert.alert(t('common.error'), t('auth.errors.googleAccessTokenFailed'));
      }
    } else if (response.type === 'error') {
      setGoogleLoading(false);
      const errorMessage = response.error?.message || 'Google sign-in failed';
      console.error('Google OAuth Error:', errorMessage);
      setError(errorMessage);
      Alert.alert(
        t('auth.errors.googleSignInFailed'),
        `${errorMessage}\n\n${t('auth.errors.youCanStillUseEmail')}`,
        [{ text: 'OK' }]
      );
    } else if (response.type === 'dismiss' || response.type === 'cancel') {
      setGoogleLoading(false);
      console.log('Google OAuth dismissed/cancelled');
    } else {
      setGoogleLoading(false);
      console.log('Google OAuth other response:', response.type);
    }
  }, [response]);

  const fetchAndHandleGoogleToken = async (accessToken?: string, idToken?: string) => {
    try {
      setGoogleLoading(true);

      // idToken (Android native) or accessToken (iOS expo-auth-session)
      const authResponse = await api.googleAuth(idToken, accessToken);

      if (authResponse.success && authResponse.data) {
        const { user, tokens, isNewUser, needsProfileSetup } = authResponse.data;

        await setAuthState(user, tokens, isNewUser ?? true, needsProfileSetup ?? true);

        const nameParts = (user.name || '').split(' ');
        setGoogleUserData({
          email: user.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          photo: user.profilePicture,
          googleId: user.id,
        });

        if (needsProfileSetup || isNewUser) {
          navigation.navigate('Goals');
        }
      } else {
        throw new Error(authResponse.message || 'Failed to authenticate with server');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.errors.googleTokenFailed');
      setError(message);
      Alert.alert(t('common.error'), message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setAppleLoading(true);
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      const firstName = credential.fullName?.givenName ?? undefined;
      const lastName = credential.fullName?.familyName ?? undefined;
      const email = credential.email ?? undefined;

      const { error } = await signInWithApple(credential.identityToken, firstName, lastName, email);

      if (error) throw error;

      // Navigate based on auth state (needsProfileSetup handled by AppNavigator)
      const state = useAuthStore.getState();
      if (state.needsProfileSetup || state.isFirstTimeUser) {
        navigation.navigate('Goals');
      }
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled — not an error
        return;
      }
      const message = err.message || t('auth.errors.signInFailed');
      setError(message);
      Alert.alert(t('auth.errors.signInFailed'), message);
    } finally {
      setAppleLoading(false);
    }
  };

  const handleEmailAuth = () => {
    console.log('Continue with Email pressed');
    setError(null); // Clear any stale error before navigating
    setAuthMethod('email');
    navigation.navigate('Email');
  };

  // Android: native Google Sign-In (no browser redirect needed)
  const handleGoogleAuthAndroid = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        t('common.info'),
        'Google Sign-in is only available in native builds. Please use email authentication or download the native app.'
      );
      return;
    }
    setGoogleLoading(true);
    setError(null);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;
      if (!idToken) {
        throw new Error(t('auth.errors.authTokenFailed'));
      }
      await fetchAndHandleGoogleToken(undefined, idToken);
    } catch (err: any) {
      if (statusCodes && err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled — do nothing
      } else if (statusCodes && err.code === statusCodes.IN_PROGRESS) {
        // already in progress — do nothing
      } else {
        const message = err.message || t('auth.errors.googleSignInFailed');
        setError(message);
        Alert.alert(t('auth.errors.signInFailed'), message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // iOS: expo-auth-session browser flow
  const handleGoogleAuth = async () => {
    if (Platform.OS === 'android') {
      return handleGoogleAuthAndroid();
    }

    if (!hasRequiredClientId) {
      Alert.alert(
        t('auth.errors.setupRequired'),
        t('auth.errors.googleOAuthMissing'),
        [{ text: 'OK' }]
      );
      return;
    }

    setGoogleLoading(true);
    setError(null);

    try {
      await promptAsync();
    } catch (err: any) {
      console.error('Google auth prompt error:', err);
      setGoogleLoading(false);
      setError(err.message || t('auth.errors.googleStartFailed'));
      Alert.alert(t('auth.errors.signInFailed'), t('auth.errors.googleStartFailed'), [{ text: 'OK' }]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Decorative oval background */}
      <View style={styles.decorativeOval} />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={styles.title}>{t('auth.welcomeScreen.title')}</Text>

          <Text style={styles.description}>
            {t('auth.welcomeScreen.description')}
          </Text>

          {/* Feature icons grid */}
          <View style={styles.featureIconsContainer}>
            <View style={styles.featureIconsRow}>
              <AuthIcon1 size={55} />
              <AuthIcon2 size={55} />
              <AuthIcon3 size={55} />
              <AuthIcon4 size={55} />
            </View>
            <View style={styles.featureIconsRow}>
              <AuthIcon5 size={55} />
              <AuthIcon6 size={55} />
              <AuthIcon7 size={55} />
              <AuthIcon8 size={55} />
            </View>
          </View>
        </View>

        {/* Buttons section */}
        <View style={styles.buttonSection}>
          {/* Continue with Email */}
          <TouchableOpacity
            style={[styles.emailButton, isGoogleLoading && styles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={isGoogleLoading}
            activeOpacity={0.85}
          >
            <EmailIcon size={20} color="#FFFFFF" />
            <Text style={styles.emailButtonText}>{t('auth.buttons.continueWithEmail')}</Text>
          </TouchableOpacity>

          {/* Continue with Google */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              (isGoogleLoading || !request || !hasRequiredClientId) && styles.buttonDisabled,
            ]}
            onPress={handleGoogleAuth}
            disabled={isGoogleLoading || !request || !hasRequiredClientId}
            activeOpacity={0.85}
          >
            <View style={styles.googleLogoContainer}>
              <Text style={styles.googleLogoText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? t('auth.messages.signingIn') : t('auth.buttons.continueWithGoogle')}
            </Text>
          </TouchableOpacity>

          {/* Sign in with Apple — iOS only */}
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={9999}
              style={[styles.appleButton, isAppleLoading && styles.buttonDisabled]}
              onPress={handleAppleAuth}
            />
          )}

          {/* Terms text */}
          <Text style={styles.termsText}>
            {t('auth.labels.byAgree')}{' '}
            <Text style={styles.termsLink}>{t('auth.labels.termsAndConditions')}</Text>
            {' '}{t('auth.labels.and')}{' '}
            <Text style={styles.termsLink}>{t('auth.labels.privacyPolicy')}</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  decorativeOval: {
    position: 'absolute',
    width: 345,
    height: 352,
    borderRadius: 999,
    backgroundColor: '#FFB09C',
    top: 26,
    left: 117,
    opacity: 0.35,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    paddingTop: 24,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    letterSpacing: -0.48,
    lineHeight: 32,
    textAlign: 'left',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#636363',
    letterSpacing: -0.32,
    lineHeight: 24,
    textAlign: 'left',
    marginBottom: 24,
  },
  featureIconsContainer: {
    width: '100%',
    gap: 12,
  },
  featureIconsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-start',
  },
  buttonSection: {
    paddingBottom: 32,
  },
  emailButton: {
    height: 56,
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  googleButton: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  googleLogoContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleLogoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  googleButtonText: {
    color: '#1C1C1C',
    fontSize: 16,
    fontWeight: '500',
  },
  appleButton: {
    height: 56,
    width: '100%',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  termsText: {
    fontSize: 12,
    color: '#636363',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: '#636363',
  },
});
