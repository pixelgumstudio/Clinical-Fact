import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, BIGGEST_NEED_OPTIONS } from '../../store/signupStore';

type BiggestNeedScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'BiggestNeed'>;

/**
 * Screen 8 of 8 — confirmed 2026-07-30 onboarding survey. Continues into
 * the existing FeatureTranscribe/FeatureChat/FeatureQuiz/Thanks chain,
 * preserving the link the old (now-retired) ContentType screen used to own.
 */
export const BiggestNeedScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<BiggestNeedScreenNavigationProp>();
  const { data, setBiggestNeed } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.biggestNeed')}
      options={BIGGEST_NEED_OPTIONS}
      selectedId={data.biggestNeed || null}
      onSelect={setBiggestNeed}
      onContinue={() => navigation.navigate('FeatureTranscribe')}
      step={8}
      totalSteps={8}
    />
  );
};

export default BiggestNeedScreen;
