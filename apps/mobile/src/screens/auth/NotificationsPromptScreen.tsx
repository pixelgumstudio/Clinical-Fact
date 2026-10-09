import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Icon, theme } from '@clinicalfact/design-system';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import notificationService from '../../services/notificationService';

type NotificationsPromptNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'NotificationsPrompt'>;

export const NotificationsPromptScreen = () => {
  const navigation = useNavigation<NotificationsPromptNavigationProp>();
  const canGoBack = navigation.canGoBack();

  const handleContinue = async () => {
    try {
      await notificationService.requestPermissions();
    } catch (error) {
      console.error('Notification permission request failed:', error);
    }
    navigation.navigate('Paywall');
  };

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
          source={require('../../../assets/Onboading_Notification.png')}
          style={styles.bellImage}
          resizeMode="contain"
        />

        <View style={styles.spacer} />

        <View style={styles.textSection}>
          <Text style={styles.title}>Turn on notifications</Text>
          <Text style={styles.subtitle}>
            This helps us stay on track to personalise your account and help you find medical
            answers better
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button variant="primary" fullWidth onPress={handleContinue}>
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
    alignItems: 'center',
  },
  bellImage: {
    width: theme.spacing[40], // 160
    height: theme.spacing[40], // 160
    marginTop: theme.spacing[20], // 80
  },
  spacer: {
    flex: 1,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: theme.spacing[12], // 48
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

export default NotificationsPromptScreen;
