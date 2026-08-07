import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, AI_TRUST_LEVEL_OPTIONS } from '../../store/signupStore';

type AiTrustLevelScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'AiTrustLevel'>;

/** Screen 7 of 8 — confirmed 2026-07-30 onboarding survey. */
export const AiTrustLevelScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<AiTrustLevelScreenNavigationProp>();
  const { data, setAiTrustLevel } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.aiTrustLevel')}
      options={AI_TRUST_LEVEL_OPTIONS}
      selectedId={data.aiTrustLevel || null}
      onSelect={setAiTrustLevel}
      onContinue={() => navigation.navigate('BiggestNeed')}
      step={7}
      totalSteps={8}
    />
  );
};

export default AiTrustLevelScreen;
