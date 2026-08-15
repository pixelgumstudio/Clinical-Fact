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
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Icon name="backFill" size={24} color="#7F8783" />
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{t('auth.labels.nameScreenTitle')}</Text>
          </View>

          {/* Side-by-side inputs */}
          <View style={styles.inputRow}>
            <Input
              ref={firstNameRef}
              containerStyle={styles.inputHalf}
              placeholder={t('auth.placeholders.firstName')}
              value={firstName}
              onChangeText={(text) => {
                setFirstNameLocal(text);
                if (error) setError(null);
              }}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              error={error || undefined}
            />
            <Input
              ref={lastNameRef}
              containerStyle={styles.inputHalf}
              placeholder={t('auth.placeholders.lastName')}
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

          <Button variant="dark" fullWidth onPress={handleContinue} disabled={!isValid}>
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
    backgroundColor: theme.colors.linen[300],
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[8], // 8
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
    gap: theme.spacing[6], // 40, confirmed gap before Continue
  },
  titleSection: {
    paddingTop: theme.spacing[8], // 32
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    paddingBottom: theme.spacing[4], // 16
    gap: theme.spacing[4], // 16, confirmed
  },
  inputHalf: {
    flex: 1,
  },
});
