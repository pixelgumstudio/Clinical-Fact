import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, ROLE_OPTIONS } from '../../store/signupStore';

type RoleScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Role'>;

/** Screen 1 of 8 — confirmed 2026-07-30 onboarding survey. */
export const RoleScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<RoleScreenNavigationProp>();
  const { data, setRole } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.role', { firstName: data.firstName })}
      options={ROLE_OPTIONS}
      selectedId={data.role || null}
      onSelect={setRole}
      onContinue={() => navigation.navigate('CurrentMethod')}
      step={1}
      totalSteps={8}
    />
  );
};

export default RoleScreen;
