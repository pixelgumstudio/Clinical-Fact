import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, AI_TOOLS_USED_OPTIONS } from '../../store/signupStore';

type AiToolsUsedScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'AiToolsUsed'>;

/** Screen 5 of 8 — confirmed 2026-07-30 onboarding survey. */
export const AiToolsUsedScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<AiToolsUsedScreenNavigationProp>();
  const { data, setAiToolsUsed } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.aiToolsUsed')}
      options={AI_TOOLS_USED_OPTIONS}
      selectedId={data.aiToolsUsed || null}
      onSelect={setAiToolsUsed}
      onContinue={() => navigation.navigate('AiToolIssue')}
      step={5}
      totalSteps={8}
    />
  );
};

export default AiToolsUsedScreen;
