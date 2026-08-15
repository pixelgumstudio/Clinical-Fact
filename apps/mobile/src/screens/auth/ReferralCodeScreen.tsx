import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { api } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import Purchases from 'react-native-purchases';

type ReferralCodeScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ReferralCode'
>;

const CURRENT_STEP = 4;
const TOTAL_STEPS = 4;

const CHECKBOX_GRADIENT: [string, string, ...string[]] = [
  '#CEF9D0',
  '#DCEEB9',
  '#FFB09C',
  '#ECE19F',
  '#F3DA93',
  '#F9C597',
];

export const ReferralCodeScreen = () => {
  const navigation = useNavigation<ReferralCodeScreenNavigationProp>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const validationSeqRef = useRef(0);
  const lastValidatedCodeRef = useRef<string>('');
  const canGoBack = navigation.canGoBack();

  const performValidation = useCallback(async (text: string) => {
    const trimmed = text.trim();

    // Skip if already validated this exact code
    if (trimmed === lastValidatedCodeRef.current && isValidated) {
      return;
    }

    const trimmedLength = trimmed.length;
    if (trimmedLength < 8 || trimmedLength > 10) {
      setError('');
      lastValidatedCodeRef.current = '';
      return;
    }

    setIsValidated(false);
    setError('');
    const seq = ++validationSeqRef.current;
    setIsValidating(true);
    try {
      const response = await api.validateReferralCode(trimmed);
      if (seq !== validationSeqRef.current) return;
      if (response.data?.valid) {
        lastValidatedCodeRef.current = trimmed;
        setIsValidated(true);
      } else {
        lastValidatedCodeRef.current = '';
        setError('Referral code not found. Check the spelling and try again.');
      }
    } catch (err) {
      if (seq !== validationSeqRef.current) return;
      lastValidatedCodeRef.current = '';
      console.error('Validation error:', err);
      setError('Failed to validate code. Please try again.');
    } finally {
      if (seq === validationSeqRef.current) setIsValidating(false);
    }
  }, [isValidated]);

  const debouncedValidate = useDebounce(performValidation, 300);

  const handleValidate = useCallback((text: string) => {
    const upper = text.toUpperCase();
    setCode(upper);
    debouncedValidate(upper);
  }, [debouncedValidate]);

  const isCodeValid = isValidated && !error && !isValidating;

  const handleContinue = async () => {
    if (!isCodeValid) {
      navigation.navigate('Setup');
      return;
    }

    setIsApplying(true);
    setError('');

    try {
      await api.applyReferralCode(code.trim().toUpperCase());

      // Tag the subscriber in RevenueCat for future webhook attribution
      await Purchases.setAttributes({ referral_code: code.trim().toUpperCase() });

      navigation.navigate('Setup');
    } catch (err: any) {
      console.error('Apply code error:', err);
      setError('Failed to apply referral code. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        {/* <View style={styles.progressTrack}>
          <LinearGradient
            colors={CHECKBOX_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              { width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` },
            ]}
          />
        </View> */}
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            Were you referred {'\n'}by someone?
          </Text>
          <Text style={styles.subtitle}>
            Enter their referral code if you have one
          </Text>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            value={code}
            onChangeText={handleValidate}
            placeholder="e.g. JOHN or TECHBRO"
            placeholderTextColor="#999"
            editable={!isApplying}
            style={styles.textInput}
          />
          {isValidating && <ActivityIndicator size="small" color="#1C1C1C" />}
        </View>

        {code.trim().length >= 8 && code.trim().length <= 10 && error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : code.trim().length >= 8 && code.trim().length <= 10 && !error && !isValidating ? (
          <Text style={styles.successText}>✓ Code is valid</Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (isApplying || isValidating) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={isApplying || isValidating}
          activeOpacity={0.85}
        >
          {isApplying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>
              {isCodeValid ? 'Continue' : 'Skip'}
            </Text>
          )}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F9F9F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  titleSection: {
    marginTop: 8,
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    letterSpacing: -0.48,
    lineHeight: 32,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#636363',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1C1C1C',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginBottom: 12,
    marginHorizontal: 0,
  },
  successText: {
    color: '#27ae60',
    fontSize: 14,
    marginBottom: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.35,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.16,
  },
  skipText: {
    color: '#999',
    fontSize: 14,
  },
});
