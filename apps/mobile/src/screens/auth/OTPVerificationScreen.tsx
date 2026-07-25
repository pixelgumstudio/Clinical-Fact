import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, OTPInput } from '@clinicfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore } from '../../store/signupStore';
import { useAuthStore } from '../../store/authStore';

type OTPScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;

export const OTPVerificationScreen = () => {
  const navigation = useNavigation<OTPScreenNavigationProp>();
  const {
    data,
    otpCode,
    setOtpCode,
    setOtpVerified,
    isVerifyingOtp,
    setVerifyingOtp,
    error,
    setError,
    authMethod,
  } = useSignupStore();

  const { verifyOtp, sendOtp, isAuthenticated } = useAuthStore();
  const canGoBack = navigation.canGoBack();

  const [resendTimer, setResendTimer] = useState(20);
  const [canResend, setCanResend] = useState(false);

  const isVerifyingRef = useRef(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0 && !canResend) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, canResend]);

  const handleVerify = async (codeOverride?: string) => {
    if (isVerifyingRef.current || verificationSuccess || isAuthenticated) {
      console.log('Verification already in progress or completed, skipping');
      return;
    }

    const codeToVerify = codeOverride ?? otpCode;

    if (codeToVerify.length !== 6) {
      setError('Please enter the complete verification code');
      return;
    }

    isVerifyingRef.current = true;
    setVerifyingOtp(true);
    setError(null);

    try {
      console.log('Starting OTP verification for:', data.email);

      const { error: otpError } = await verifyOtp(data.email, codeToVerify);

      if (otpError) {
        console.error('OTP verification error:', otpError.message);
        if (otpError.message?.includes('expired')) {
          setError('Code expired. Please request a new code.');
        } else if (otpError.message?.includes('invalid')) {
          setError('Invalid code. Please check and try again.');
        } else {
          setError(otpError.message || 'Invalid verification code. Please try again.');
        }
        isVerifyingRef.current = false;
        return;
      }

      console.log('OTP verification successful — session established.');
      setOtpVerified(true);
      setVerificationSuccess(true);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
      isVerifyingRef.current = false;
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(20);
    setError(null);
    isVerifyingRef.current = false;
    setVerificationSuccess(false);

    const { error: resendError } = await sendOtp(data.email);
    if (resendError) {
      setError(resendError.message || 'Failed to resend code. Please try again.');
      setCanResend(true);
    }
  };

  useEffect(() => {
    if (otpCode.length < 6) {
      isVerifyingRef.current = false;
      setVerificationSuccess(false);
    }
  }, [otpCode]);

  const handleOTPComplete = useCallback((code: string) => {
    if (code.length === 6 && !isVerifyingOtp && !isVerifyingRef.current && !verificationSuccess && !isAuthenticated) {
      console.log('Auto-verifying OTP on completion');
      handleVerify(code); // pass code directly to avoid stale closure on otpCode
    }
  }, [isVerifyingOtp, verificationSuccess, isAuthenticated]);

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (local.length <= 1) return email;
    return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 3))}@${domain}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Confirm your Email address</Text>
            <Text style={styles.subtitle}>
              {'Please enter the OTP code we sent to your email address '}
              {maskEmail(data.email)}
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpSection}>
            <OTPInput
              length={6}
              value={otpCode}
              onChange={setOtpCode}
              onComplete={handleOTPComplete}
              error={error || undefined}
              autoFocus
            />
          </View>

          {/* Resend row */}
          <View style={styles.resendSection}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>{"Didn't get code?"}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendText}>
                {`Resend code in ${resendTimer} Sec`}
              </Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={() => handleVerify()}
            loading={isVerifyingOtp}
            disabled={otpCode.length !== 6 || verificationSuccess}
            style={styles.continueButton}
            textStyle={styles.continueButtonText}
          >
            {verificationSuccess ? 'Verified!' : 'Continue'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#1C1C1C',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    letterSpacing: -0.48,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#636363',
    letterSpacing: -0.32,
    lineHeight: 24,
    textAlign: 'center',
  },
  otpSection: {
    width: '100%',
    marginBottom: 24,
  },
  resendSection: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#636363',
  },
  resendLink: {
    color: '#1C1C1C',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueButton: {
    height: 56,
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
