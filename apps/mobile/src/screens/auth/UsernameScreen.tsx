import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, Input, Icon, theme } from '@clinicalfact/design-system';
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
          navigation.navigate('ProfessionalDeclaration');
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
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="backFill" size={24} color="#7F8783" />
            </Pressable>
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

          <View style={styles.inputSection}>
            <Input
              ref={inputRef}
              placeholder={t('auth.placeholders.username')}
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
              error={error || undefined}
            />

            <Button variant="primary" fullWidth onPress={handleContinue} loading={isLoading} disabled={isDisabled}>
              {t('auth.buttons.continue')}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[2], // 8
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[4], // 16
  },
  titleSection: {
    alignItems: 'center',
    gap: theme.spacing[2], // 8
    paddingVertical: theme.spacing[6], // 24
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
    width: '65%',
  },
  inputSection: {
    gap: theme.spacing[10], // 40, confirmed gap before Continue
  },
});
