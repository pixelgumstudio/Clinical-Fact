import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { FeatureScreenLayout } from '../../components/FeatureScreenLayout';

type Feature4NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Feature4'>;

export const Feature4Screen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Feature4NavigationProp>();

  return (
    <FeatureScreenLayout
      image={require('../../../assets/FeatureShowcase4.png')}
      title={t('auth.features.feature4.title')}
      subtitle={t('auth.features.feature4.description')}
      continueLabel={t('auth.buttons.continue')}
      onContinue={() => navigation.navigate('Thanks')}
    />
  );
};

export default Feature4Screen;
