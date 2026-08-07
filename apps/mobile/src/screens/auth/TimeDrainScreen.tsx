import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, TIME_DRAIN_OPTIONS } from '../../store/signupStore';

type TimeDrainScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'TimeDrain'>;

/** Screen 3 of 8 — confirmed 2026-07-30 onboarding survey. */
export const TimeDrainScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<TimeDrainScreenNavigationProp>();
  const { data, setTimeDrain } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.timeDrain')}
      options={TIME_DRAIN_OPTIONS}
      selectedId={data.timeDrain || null}
      onSelect={setTimeDrain}
      onContinue={() => navigation.navigate('AppExpectation')}
      step={3}
      totalSteps={8}
    />
  );
};

export default TimeDrainScreen;
