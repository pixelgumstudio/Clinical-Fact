import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, AI_TOOL_ISSUE_OPTIONS } from '../../store/signupStore';

type AiToolIssueScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'AiToolIssue'>;

/** Screen 6 of 8 — confirmed 2026-07-30 onboarding survey. */
export const AiToolIssueScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<AiToolIssueScreenNavigationProp>();
  const { data, setAiToolIssue } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.aiToolIssue')}
      options={AI_TOOL_ISSUE_OPTIONS}
      selectedId={data.aiToolIssue || null}
      onSelect={setAiToolIssue}
      onContinue={() => navigation.navigate('AiTrustLevel')}
      step={6}
      totalSteps={8}
    />
  );
};

export default AiToolIssueScreen;
