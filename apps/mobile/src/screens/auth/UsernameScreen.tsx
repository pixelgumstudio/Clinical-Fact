import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore } from '../../store/signupStore';
import { api } from '../../services/api';

type UsernameScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Username'>;

export const UsernameScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<UsernameScreenNavigationProp>();
  const { data, setUsername, error, setError, isLoading, setLoading } = useSignupStore();
  const canGoBack = navigation.canGoBack();

  const [username, setUsernameLocal] = useState(data.username);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const validateUsername = (value: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(value);
  };

  const handleContinue = async () => {
    if (!username.trim()) {
      setError(t('auth.errors.usernameRequired'));
      return;
    }
    if (!validateUsername(username)) {
      setError(t('auth.errors.usernameLength'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.checkUsernameAvailability(username.toLowerCase());
      if (response.success && response.data) {
        if (response.data.available) {
          setUsername(username.toLowerCase());
          navigation.navigate('Goals');
        } else {
          setError(t('auth.errors.usernameTaken'));
        }
      } else {
        setError(response.message || t('auth.errors.usernameCheckFailed'));
      }
    } catch (err: any) {
      setError(t('auth.errors.usernameError'));
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !username.trim() || isLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{t('auth.onboarding.username')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.onboarding.usernameSubtitle')}
            </Text>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={t('auth.placeholders.username')}
              placeholderTextColor="#A6A6A6"
              value={username ? `@${username}` : ''}
              onChangeText={(text) => {
                const clean = text.startsWith('@') ? text.slice(1) : text;
                setUsernameLocal(clean);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.continueButton, isDisabled && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={isDisabled}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>{t('auth.buttons.continue')}</Text>
            )}
          </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#1C1C1C',
    fontWeight: '400',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    letterSpacing: -0.48,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#636363',
    letterSpacing: -0.32,
    lineHeight: 24,
    textAlign: 'center',
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
    fontWeight: '400',
    color: '#1C1C1C',
    letterSpacing: -0.32,
  },
  errorText: {
    fontSize: 13,
    color: '#F43F5E',
    marginBottom: 8,
    marginLeft: 4,
  },
  continueButton: {
    backgroundColor: '#1C1C1C',
    borderRadius: 9999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.16,
  },
});
