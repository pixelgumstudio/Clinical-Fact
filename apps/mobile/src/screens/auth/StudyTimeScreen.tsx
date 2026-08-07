import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, STUDY_TIME_OPTIONS } from '../../store/signupStore';

type StudyTimeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'StudyTime'>;

/** Screen 1 of 2 — post-Thanks mini survey (confirmed 2026-07-29), sits between Thanks and Referral. */
export const StudyTimeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<StudyTimeScreenNavigationProp>();
  const { data, setStudyTimePerWeek } = useSignupStore();

  return (
    <SurveyQuestionScreen
      title={t('auth.survey.studyTimePerWeek')}
      options={STUDY_TIME_OPTIONS}
      selectedId={data.studyTimePerWeek || null}
      onSelect={setStudyTimePerWeek}
      onContinue={() => navigation.navigate('ComingUp')}
      step={1}
      totalSteps={2}
    />
  );
};

export default StudyTimeScreen;
