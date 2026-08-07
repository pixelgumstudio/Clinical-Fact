import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Button, Input, Icon, theme } from '@clinicalfact/design-system';

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

const GOOGLE_EXPO_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

WebBrowser.maybeCompleteAuthSession();

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const {
    setAuthMethod,
    setEmail,
    setGoogleUserData,
    isGoogleLoading,
    setGoogleLoading,
    isSendingOtp,
    setSendingOtp,
    setError,
    error,
  } = useSignupStore();
  const { setAuthState, sendOtp } = useAuthStore();
  const [localEmail, setLocalEmail] = useState('');
  const emailInputRef = useRef<TextInput>(null);

  const validateEmail = (value: string) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(value);
  };

  useEffect(() => {
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
          navigation.navigate('Role');
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

  // Focuses the inline email field rather than submitting — this button has
  // no email value of its own to send yet.
  const handleFocusEmailInput = () => {
    emailInputRef.current?.focus();
  };

  // Sends the OTP directly from this screen and goes straight to
  // verification — there's no separate "enter your email" screen anymore.
  // sendOtp/verifyOtp already handle sign-up and sign-in identically
  // (AppNavigator routes new vs. returning users after verification based
  // on the isNewUser/needsProfileSetup the backend returns), so this same
  // flow works whether the email belongs to a new or existing user.
  const handleEmailAuth = async () => {
    if (!localEmail.trim()) {
      setError(t('auth.errors.emailRequired'));
      emailInputRef.current?.focus();
      return;
    }

    if (!validateEmail(localEmail.trim())) {
      setError(t('auth.errors.invalidEmail'));
      emailInputRef.current?.focus();
      return;
    }

    setAuthMethod('email');
    setSendingOtp(true);
    setError(null);

    const { error: otpError } = await sendOtp(localEmail.trim());

    setSendingOtp(false);

    if (otpError) {
      setError(otpError.message || t('auth.errors.codeSendFailed'));
      return;
    }

    setEmail(localEmail.trim());
    navigation.navigate('OTPVerification');
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

      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.card}>
            <View style={styles.grabber} />

            <Text style={styles.cardTitle}>{t('auth.welcomeScreen.createAccountTitle')}</Text>

            <View style={styles.buttonGroup}>
              {/* Icon/label pairing here is intentionally as designed: the
                  Google-mark button reads "Continue with Email" and the
                  envelope-icon button reads "Continue with Google" —
                  confirmed correct against a real device screenshot
                  (2026-07-29), not a mismatch to fix. Each button's onPress
                  follows its label text, since that's what the user reads. */}
              <Button
                variant="primary"
                leftIcon={<Icon name="google" size={24} />}
                onPress={handleFocusEmailInput}
                disabled={isGoogleLoading || isSendingOtp}
              >
                {t('auth.buttons.continueWithEmail')}
              </Button>

              <Button
                variant="primary"
                leftIcon={<Icon name="emailFill" size={24} color={theme.colors.white} />}
                onPress={handleGoogleAuth}
                disabled={isGoogleLoading || !request || !hasRequiredClientId}
                loading={isGoogleLoading}
                style={styles.emailAuthButton}
              >
                {t('auth.buttons.continueWithGoogle')}
              </Button>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.welcomeScreen.orSignUpWith')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.emailGroup}>
              <Input
                ref={emailInputRef}
                placeholder={t('auth.placeholders.enterEmail')}
                value={localEmail}
                onChangeText={(text) => {
                  setLocalEmail(text);
                  if (error) setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={error || undefined}
              />
              <Button
                variant="secondary"
                fullWidth
                onPress={handleEmailAuth}
                loading={isSendingOtp}
                disabled={isGoogleLoading || isSendingOtp}
              >
                {t('auth.welcomeScreen.signUpWithEmail')}
              </Button>
            </View>

            <Text style={styles.termsText}>
              {t('auth.labels.byAgree')}{' '}
              <Text style={styles.termsLink}>{t('auth.labels.termsAndConditions')}</Text>
              {' '}{t('auth.labels.and')}{' '}
              <Text style={styles.termsLink}>{t('auth.labels.privacyPolicy')}</Text>
            </Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
    height: '65%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    marginHorizontal: theme.spacing[4], // 16, close to the confirmed 18
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[6], // 24
    backgroundColor: theme.colors.linen[300],
    borderRadius: theme.spacing[8], // 32
    gap: theme.spacing[6], // 24
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.white,
    marginBottom: theme.spacing[1],
  },
  cardTitle: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  buttonGroup: {
    gap: theme.spacing[3], // 12
  },
  emailAuthButton: {
    backgroundColor: theme.colors.yale[900],
    borderColor: theme.colors.yale[900],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2], // 8
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.grey[100],
  },
  dividerText: {
    ...theme.typography.textStyles.label1,
    color: theme.colors.yale[900],
  },
  emailGroup: {
    gap: theme.spacing[3], // 12
  },
  termsText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  termsLink: {
    textDecorationLine: 'underline',
    color: theme.colors.grey[900],
  },
});
