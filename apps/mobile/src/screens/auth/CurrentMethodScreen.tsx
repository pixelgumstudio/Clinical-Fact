import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, CURRENT_METHOD_OPTIONS } from '../../store/signupStore';

type CurrentMethodScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'CurrentMethod'>;

/** Screen 2 of 8 — confirmed 2026-07-30 onboarding survey. */
export const CurrentMethodScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<CurrentMethodScreenNavigationProp>();
  const { data, setCurrentMethod } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.currentMethod')}
      options={CURRENT_METHOD_OPTIONS}
      selectedId={data.currentMethod || null}
      onSelect={setCurrentMethod}
      onContinue={() => navigation.navigate('TimeDrain')}
      step={2}
      totalSteps={8}
    />
  );
};

export default CurrentMethodScreen;
