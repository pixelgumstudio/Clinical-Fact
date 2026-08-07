import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Icon, theme } from '@clinicalfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type ProfessionalDeclarationNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ProfessionalDeclaration'
>;

/**
 * New screen — confirmed 2026-07-29. Sits between Username and Goals.
 * "Accept and continue" is disabled until the checkbox is checked, matching
 * the standard pattern for a legal/consent step (not explicitly shown as a
 * distinct state in the source export, but the only sensible read of a
 * checkbox + accept button pairing).
 *
 * Note: this only gates local navigation. Nothing here persists acceptance
 * to signupStore or the backend — there was no existing field or API
 * contract for it, and inventing one risked not matching what the backend
 * actually expects. Flag if acceptance needs to be recorded server-side.
 */
export const ProfessionalDeclarationScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfessionalDeclarationNavigationProp>();
  const canGoBack = navigation.canGoBack();
  const [accepted, setAccepted] = useState(false);

  const handleContinue = () => {
    if (!accepted) return;
    navigation.navigate('Role');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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

      <View style={styles.titleSection}>
        <Text style={styles.title}>{t('auth.professionalDeclaration.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.professionalDeclaration.subtitle')}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            {t('auth.professionalDeclaration.disclaimerIntro')}
            {'\n\n'}
            <Text style={styles.disclaimerHeading}>
              {t('auth.professionalDeclaration.disclaimerHeading')}
            </Text>
            {'\n'}
            {t('auth.professionalDeclaration.disclaimerBody')}
          </Text>
        </View>
      </ScrollView>

      {/* Pinned footer — checkbox + accept button stay reachable without
          scrolling through the full disclaimer text */}
      <View style={styles.footer}>
        <View style={styles.checkboxCard}>
          <Checkbox
            checked={accepted}
            onChange={setAccepted}
            label={t('auth.professionalDeclaration.checkboxLabel')}
          />
        </View>

        <Button variant="primary" fullWidth onPress={handleContinue} disabled={!accepted}>
          {t('auth.professionalDeclaration.acceptButton')}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
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
  titleSection: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingVertical: theme.spacing[6], // 24
    gap: theme.spacing[2], // 8
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
  },
  subtitle: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingBottom: theme.spacing[4],
  },
  disclaimerCard: {
    backgroundColor: theme.colors.grey[10],
    borderWidth: 1,
    borderColor: theme.colors.grey[100],
    borderRadius: theme.borderRadius.input, // 16
    padding: theme.spacing[4], // 16
  },
  disclaimerText: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[900],
  },
  disclaimerHeading: {
    ...theme.typography.textStyles.subtitle1,
    color: theme.colors.grey[900],
  },
  footer: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[4], // 16
    gap: theme.spacing[4], // 16
  },
  checkboxCard: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.input, // 16
    padding: theme.spacing[4], // 16
  },
});

export default ProfessionalDeclarationScreen;
