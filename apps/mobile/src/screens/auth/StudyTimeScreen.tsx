import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { SurveyQuestionScreen } from '../../components/SurveyQuestionScreen';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSignupStore, STUDY_TIME_OPTIONS } from '../../store/signupStore';

type StudyTimeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'StudyTime'>;

/** Screen 2 of 3 — post-Thanks mini survey, sits between Referral and ComingUp. */
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
      step={2}
      totalSteps={3}
    />
  );
};

export default StudyTimeScreen;
