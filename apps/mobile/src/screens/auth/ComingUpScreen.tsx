import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, COMING_UP_OPTIONS } from '../../store/signupStore';

type ComingUpScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ComingUp'>;

/** Screen 3 of 3 — post-Thanks mini survey, sits between StudyTime and ReferralCode. */
export const ComingUpScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ComingUpScreenNavigationProp>();
  const { data, setComingUp } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.comingUp')}
      options={COMING_UP_OPTIONS}
      selectedId={data.comingUp || null}
      onSelect={setComingUp}
      onContinue={() => navigation.navigate('ReferralCode')}
      step={3}
      totalSteps={3}
    />
  );
};

export default ComingUpScreen;
