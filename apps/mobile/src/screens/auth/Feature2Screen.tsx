import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { FeatureScreenLayout } from '../../components/FeatureScreenLayout';

type Feature2NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Feature2'>;

export const Feature2Screen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Feature2NavigationProp>();

  return (
    <FeatureScreenLayout
      image={require('../../../assets/FeatureShowcase2.png')}
      title={t('auth.features.feature2.title')}
      subtitle={t('auth.features.feature2.description')}
      continueLabel={t('auth.buttons.continue')}
      onContinue={() => navigation.navigate('Feature3')}
    />
  );
};

export default Feature2Screen;
