import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, APP_EXPECTATION_OPTIONS } from '../../store/signupStore';

type AppExpectationScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'AppExpectation'>;

/** Screen 4 of 8 — confirmed 2026-07-30 onboarding survey. */
export const AppExpectationScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<AppExpectationScreenNavigationProp>();
  const { data, setAppExpectation } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.appExpectation')}
      options={APP_EXPECTATION_OPTIONS}
      selectedId={data.appExpectation || null}
      onSelect={setAppExpectation}
      onContinue={() => navigation.navigate('AiToolsUsed')}
      step={4}
      totalSteps={8}
    />
  );
};

export default AppExpectationScreen;
