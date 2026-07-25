import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Checkbox } from '@clinicfact/design-system';
import { colors, spacing, typography } from '@clinicfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, FRUSTRATION_OPTIONS } from '../../store/signupStore';

type FrustrationScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const FrustrationScreen = () => {
  const navigation = useNavigation<FrustrationScreenNavigationProp>();
  const { data, toggleFrustration } = useSignupStore();
  const canGoBack = navigation.canGoBack();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleContinue = () => {
    navigation.navigate('Thanks');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>
              {data.firstName}, what frustrates you most about taking notes?
            </Text>
            <Text style={styles.subtitle}>
              Select all that apply. This helps us solve your problems.
            </Text>
          </View>

          <View style={styles.optionsSection}>
            {FRUSTRATION_OPTIONS.map((option) => {
              const isSelected = data.frustrations.includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => toggleFrustration(option.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        isSelected && styles.iconContainerSelected,
                      ]}
                    >
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleFrustration(option.id)}
                      size="medium"
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleContinue}
          disabled={data.frustrations.length === 0}
          style={styles.continueButton}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[6],
  },
  titleSection: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  optionsSection: {
    gap: spacing[3],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing[4],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.neutral[900],
    backgroundColor: colors.neutral[50],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  iconContainerSelected: {
    backgroundColor: colors.neutral[200],
  },
  optionIcon: {
    fontSize: 22,
  },
  optionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    flex: 1,
  },
  optionLabelSelected: {
    fontWeight: typography.fontWeight.semibold,
  },
  checkboxContainer: {
    marginLeft: spacing[2],
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  continueButton: {
    backgroundColor: colors.neutral[900],
  },
});
