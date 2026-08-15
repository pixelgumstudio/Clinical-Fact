import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, REFERRAL_OPTIONS } from '../../store/signupStore';

type ReferralScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Referral'>;

export const ReferralScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ReferralScreenNavigationProp>();
  const { data, setReferralSource } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.referralSource')}
      options={REFERRAL_OPTIONS}
      selectedId={data.referralSource || null}
      onSelect={setReferralSource}
      onContinue={() => navigation.navigate('StudyTime')}
      step={1}
      totalSteps={3}
    />
  );
};

export default ReferralScreen;
