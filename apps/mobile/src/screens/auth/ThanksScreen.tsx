import React from 'react';
import { View, Text, StyleSheet, ScrollView, DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, Icon, theme } from '@clinicalfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type ThanksScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Thanks'>;

const TESTIMONIALS: { id: number; quote: string; author: string; offset: DimensionValue }[] = [
  {
    id: 1,
    quote:
      'My lecture recordings used to pile up for weeks. Now, Clinical Fact transcribes and summarizes everything before the next class.',
    author: 'Amara Smith, Havard university',
    offset: '11%',
  },
  {
    id: 2,
    quote:
      'I used to copy notes from videos manually. Now, I just paste the link and get highlights ready for revision.',
    author: 'Kenny vaughan, Youtube learner',
    offset: '22%',
  },
  {
    id: 3,
    quote:
      "I'm terrible at remembering key details. Clinical Fact's flashcards and Quiz mastery makes it stick easily for rememberance",
    author: 'Clara Johnson, University of california',
    offset: '6%',
  },
  {
    id: 4,
    quote:
      'Clinical Fact feels like a study buddy who already understands how I learn best',
    author: 'Barry Rice, Walmart staff',
    offset: '22%',
  },
];

export const ThanksScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ThanksScreenNavigationProp>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.titleSection}>
        <Text style={styles.title}>{t('auth.thanks.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.thanks.subtitle')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {TESTIMONIALS.map((item) => (
          <View key={item.id} style={[styles.card, { width: '72%', marginLeft: item.offset }]}>
            <View style={styles.starsRow}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="starFill" size={18} color="#FCB500" />
              ))}
            </View>
            <Text style={styles.quoteText}>{item.quote}</Text>
            <Text style={styles.authorText}>{item.author}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="primary" fullWidth onPress={() => navigation.navigate('StudyTime')}>
          {t('auth.buttons.continue')}
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
  titleSection: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[6], // 24
    gap: theme.spacing[4], // 16
  },
  title: {
    fontFamily: theme.typography.fontFamily.interSemiBold,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: 24,
    lineHeight: 32,
    color: theme.colors.yale[900],
  },
  subtitle: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[700],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing[8], // 32
    paddingBottom: theme.spacing[4],
    gap: theme.spacing[6], // 24
  },
  card: {
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.grey[50],
    borderRadius: theme.borderRadius.lg, // 16
    padding: theme.spacing[3], // 12
    gap: theme.spacing[3], // 12
  },
  starsRow: {
    flexDirection: 'row',
  },
  quoteText: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[600],
  },
  authorText: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
  },
  footer: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingBottom: theme.spacing[2], // 8
  },
});

export default ThanksScreen;
