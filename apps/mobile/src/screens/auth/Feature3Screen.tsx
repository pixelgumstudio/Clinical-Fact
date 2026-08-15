import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { FeatureScreenLayout } from '../../components/FeatureScreenLayout';

type Feature3NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Feature3'>;

export const Feature3Screen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Feature3NavigationProp>();

  return (
    <FeatureScreenLayout
      image={require('../../../assets/FeatureShowcase3.png')}
      title={t('auth.features.feature3.title')}
      subtitle={t('auth.features.feature3.description')}
      continueLabel={t('auth.buttons.continue')}
      onContinue={() => navigation.navigate('Feature4')}
    />
  );
};

export default Feature3Screen;
