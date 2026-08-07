import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Show notifications while the app is in the foreground too (Expo's default handler
// suppresses them otherwise, which reads as "notifications are broken" during testing).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  private isNotificationsAvailable = true;

  /** Requests permission, registers the Android notification channel, and returns this
   *  device's Expo push token — or null if unavailable (simulator, permission denied, etc). */
  async initializeNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Notifications');
        this.isNotificationsAvailable = false;
        return null;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      // Cast required: PermissionResponse base type doesn't resolve correctly in this
      // expo-notifications version (the 'expo' re-export is missing the type).
      const existingPermissions = await Notifications.getPermissionsAsync();
      const existingStatus = (existingPermissions as any).status as string;
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = (requested as any).status as string;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        this.isNotificationsAvailable = false;
        return null;
      }

      return this.getDevicePushToken();
    } catch (error) {
      console.error('Error initializing notifications:', error);
      this.isNotificationsAvailable = false;
      return null;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const result = await Notifications.requestPermissionsAsync();
      return (result as any).status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async getDevicePushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) return null;
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn('No EAS projectId configured — cannot request an Expo push token');
        return null;
      }
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      return token.data;
    } catch (error) {
      console.warn('Could not get device push token:', error);
      return null;
    }
  }

  handleNotificationReceived(notification: Notifications.Notification): void {
    if (!this.isNotificationsAvailable) return;
    console.log('Notification received:', notification);
  }

  handleNotificationResponse(response: Notifications.NotificationResponse): void {
    if (!this.isNotificationsAvailable) return;
    console.log('Notification response:', response);
  }

  showLocalNotification(title: string, body: string, data?: Record<string, any>): void {
    if (!this.isNotificationsAvailable) {
      console.log('Local notification (unavailable in dev):', title, body);
      return;
    }
    Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
    });
  }
}

export default new NotificationService();
