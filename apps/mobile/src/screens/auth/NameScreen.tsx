import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button } from '@clinicfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore } from '../../store/signupStore';

type NameScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Name'>;

export const NameScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NameScreenNavigationProp>();
  const { data, setFirstName, setLastName, error, setError } = useSignupStore();
  const canGoBack = navigation.canGoBack();

  const [firstName, setFirstNameLocal] = useState(data.firstName);
  const [lastName, setLastNameLocal] = useState(data.lastName);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      firstNameRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleContinue = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError(t('auth.errors.firstLastNameRequired'));
      return;
    }

    setFirstName(firstName.trim());
    setLastName(lastName.trim());
    setError(null);
    navigation.navigate('Username');
  };

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          <Text style={styles.title}>{t('auth.labels.nameScreenTitle')}</Text>

          {/* Side-by-side inputs */}
          <View style={styles.inputRow}>
            <TextInput
              ref={firstNameRef}
              style={[styles.input, error ? styles.inputError : null]}
              placeholder={t('auth.placeholders.firstName')}
              placeholderTextColor="#A6A6A6"
              value={firstName}
              onChangeText={(text) => {
                setFirstNameLocal(text);
                if (error) setError(null);
              }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
            <TextInput
              ref={lastNameRef}
              style={[styles.input, error ? styles.inputError : null]}
              placeholder={t('auth.placeholders.lastName')}
              placeholderTextColor="#A6A6A6"
              value={lastName}
              onChangeText={(text) => {
                setLastNameLocal(text);
                if (error) setError(null);
              }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleContinue}
            disabled={!isValid}
            style={styles.continueButton}
            textStyle={styles.continueButtonText}
          >
            {t('auth.buttons.continue')}
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
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    letterSpacing: -0.48,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
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
    marginTop: 8,
    marginLeft: 4,
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
