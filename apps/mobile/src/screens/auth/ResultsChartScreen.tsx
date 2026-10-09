import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Icon, theme } from '@clinicalfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type ResultsChartScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResultsChart'>;

export const ResultsChartScreen = () => {
  const navigation = useNavigation<ResultsChartScreenNavigationProp>();
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="backFill" size={24} color={theme.colors.grey[600]} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      <View style={styles.content}>
        <Image
          source={require('../../../assets/Get_Better_Result.png')}
          style={styles.chartImage}
          resizeMode="contain"
        />

        <View style={styles.textSection}>
          <Text style={styles.title}>Get better results</Text>
          <Text style={styles.subtitle}>
            Over 95% of Clinicalfact users score 95% and above on their test and exam
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          variant="primary"
          fullWidth
          onPress={() => navigation.navigate('NotificationsPrompt')}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.linen[300],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4], // 16
    paddingTop: theme.spacing[2], // 8
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.grey[10],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[6], // 24
    justifyContent: 'center',
  },
  chartImage: {
    width: '100%',
    height: theme.spacing[96], // 384
  },
  textSection: {
    alignItems: 'center',
    marginTop: theme.spacing[6], // 24
    gap: theme.spacing[2], // 8
  },
  title: {
    ...theme.typography.textStyles.h5,
    color: theme.colors.grey[900],
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.textStyles.p1,
    color: theme.colors.grey[600],
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.spacing[4], // 16
    paddingBottom: theme.spacing[4], // 16
    paddingTop: theme.spacing[3], // 12
  },
});

export default ResultsChartScreen;
