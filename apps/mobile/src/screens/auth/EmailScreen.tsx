import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button } from '@clinicfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore } from '../../store/signupStore';
import { useAuthStore } from '../../store/authStore';

type EmailScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Email'>;

export const EmailScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<EmailScreenNavigationProp>();
  const { data, setEmail, isSendingOtp, setSendingOtp, setError, error, authMethod } = useSignupStore();
  const { sendOtp } = useAuthStore();
  const [localEmail, setLocalEmail] = useState(data.email);
  const [isLogin, setIsLogin] = useState(false);
  const emailInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };

  const handleEmailBlur = () => {
    if (localEmail.trim() && !validateEmail(localEmail)) {
      setError(t('auth.errors.invalidEmail'));
    }
  };

  const handleContinue = async () => {
    if (!localEmail.trim()) {
      setError(t('auth.errors.emailRequired'));
      return;
    }

    if (!validateEmail(localEmail)) {
      setError(t('auth.errors.invalidEmail'));
      return;
    }

    setSendingOtp(true);
    setError(null);

    const { error: otpError } = await sendOtp(localEmail);

    setSendingOtp(false);

    if (otpError) {
      setError(otpError.message || t('auth.errors.codeSendFailed'));
      return;
    }

    setEmail(localEmail);
    navigation.navigate('OTPVerification');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        {/* Top spacer gives the bottom-sheet feel */}
        <View style={styles.topSpacer} />

        {/* Sheet panel */}
        <View style={styles.container}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Mail icon */}
          <View style={styles.iconContainer}>
            <Image
            source={require("../../../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          </View> 
          

          {/* Title */}
          <Text style={styles.title}>{t('auth.placeholders.enterEmail')}</Text>

          {/* Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              ref={emailInputRef}
              style={[styles.input, error ? styles.inputError : null]}
              placeholder={t('auth.placeholders.enterEmail')}
              placeholderTextColor="#A6A6A6"
              value={localEmail}
              onChangeText={(text) => {
                setLocalEmail(text);
                if (error) setError(null);
              }}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              variant="primary"
              size="large"
              fullWidth
              onPress={handleContinue}
              loading={isSendingOtp}
              disabled={!localEmail.trim()}
              style={styles.continueButton}
              textStyle={styles.continueButtonText}
            >
              {t('auth.buttons.continue')}
            </Button>

            <Text style={styles.termsText}>
              {t('auth.labels.byAgree')}{'\n'}
              <Text style={styles.termsLink}>{t('auth.labels.termsAndConditions')}</Text>
              {' '}{t('auth.labels.and')}{' '}
              <Text style={styles.termsLink}>{t('auth.labels.privacyPolicy')}</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  topSpacer: {
    flex: 1,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D7D7D7',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#F9F9F9',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1C1C1C',
    letterSpacing: -0.32,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  footer: {
    marginTop: 20,
  },
  continueButton: {
    height: 56,
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    marginBottom: 16,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
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
