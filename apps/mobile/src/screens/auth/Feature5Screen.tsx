import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { FeatureScreenLayout } from '../../components/FeatureScreenLayout';

type Feature5NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Feature5'>;

export const Feature5Screen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Feature5NavigationProp>();

  return (
    <FeatureScreenLayout
      image={require('../../../assets/FeatureShowcase5.png')}
      title={t('auth.features.feature5.title')}
      subtitle={t('auth.features.feature5.description')}
      continueLabel={t('auth.buttons.continue')}
      onContinue={() => navigation.navigate('Thanks')}
    />
  );
};

export default Feature5Screen;
