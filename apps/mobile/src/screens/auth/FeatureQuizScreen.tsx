import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Icon, theme } from '@clinicalfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { FeatureScreenLayout } from '../../components/FeatureScreenLayout';

type FeatureQuizNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'FeatureQuiz'>;

const SELECTED_INDEX = 1;

export const FeatureQuizScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<FeatureQuizNavigationProp>();

  const answers = [
    t('auth.features.quiz.answer1'),
    t('auth.features.quiz.answer2'),
    t('auth.features.quiz.answer3'),
    t('auth.features.quiz.answer4'),
  ];

  return (
    <FeatureScreenLayout
      progress={0.83}
      title={t('auth.features.quiz.title')}
      subtitle={t('auth.features.quiz.description')}
      continueLabel={t('auth.buttons.continue')}
      onContinue={() => navigation.navigate('Thanks')}
    >
      <View style={styles.illustrationWrap}>
      <Text style={styles.questionCounter}>{t('auth.features.quiz.questionCounter')}</Text>
      <Text style={styles.questionText}>{t('auth.features.quiz.questionText')}</Text>

      <View style={styles.answersContainer}>
        {answers.map((answer, index) => {
          const isSelected = index === SELECTED_INDEX;
          if (isSelected) {
            return (
              <LinearGradient
                key={answer}
                colors={['#F9F3A3', '#FFB09C', '#FDE68A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.answerSelected}
              >
                <Icon name="sucessfulFill" size={22} color={theme.colors.grey[900]} />
                <Text style={styles.answerTextSelected}>{answer}</Text>
              </LinearGradient>
            );
          }
          return (
            <View key={answer} style={styles.answerOption}>
              <Icon name="unsucessful" size={22} color={theme.colors.grey[200]} />
              <Text style={styles.answerText}>{answer}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <LinearGradient
          colors={['#BBDEFB', '#F8BBD9', '#C8E6C9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Text style={styles.statLabel}>{t('auth.features.quiz.scoredLabel')}</Text>
          <Text style={styles.statValue}>{t('auth.features.quiz.scoredValue')}</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#B3E5FC', '#B2DFDB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCard}
        >
          <Text style={styles.statLabel}>{t('auth.features.quiz.timeLabel')}</Text>
          <Text style={styles.statValue}>{t('auth.features.quiz.timeValue')}</Text>
        </LinearGradient>
      </View>
      </View>
    </FeatureScreenLayout>
  );
};

const styles = StyleSheet.create({
  illustrationWrap: {
    alignSelf: 'center',
    width: '78%',
  },
  questionCounter: {
    ...theme.typography.textStyles.p3,
    color: theme.colors.grey[600],
    marginBottom: theme.spacing[2], // 8
  },
  questionText: {
    ...theme.typography.textStyles.title1,
    color: theme.colors.grey[900],
    marginBottom: theme.spacing[5], // 20
  },

  answersContainer: {
    gap: 10,
  },
  answerOption: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg, // 16
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
    ...theme.shadows.sm,
  },
  answerText: {
    ...theme.typography.textStyles.p2,
    color: theme.colors.grey[700],
    flex: 1,
  },
  answerSelected: {
    borderRadius: theme.borderRadius.lg, // 16
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3], // 12
  },
  answerTextSelected: {
    ...theme.typography.textStyles.subtitle2,
    color: theme.colors.grey[900],
    flex: 1,
  },

  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing[3], // 12
    marginTop: theme.spacing[4], // 16
  },
  statCard: {
    flex: 1,
    borderRadius: theme.borderRadius.lg, // 16
    padding: 14,
  },
  statLabel: {
    ...theme.typography.textStyles.label2,
    color: theme.colors.grey[700],
    marginBottom: theme.spacing[1],
  },
  statValue: {
    ...theme.typography.textStyles.h6,
    color: theme.colors.grey[900],
  },
});

export default FeatureQuizScreen;
