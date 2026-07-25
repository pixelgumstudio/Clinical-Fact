import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

class NotificationService {
  private isNotificationsAvailable = true;

  async initializeNotifications(): Promise<void> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Notifications');
        this.isNotificationsAvailable = false;
        return;
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
        return;
      }

      try {
        const token = await Notifications.getExpoPushTokenAsync();
        console.log('Expo push token:', token.data);
      } catch (tokenError) {
        console.warn('Could not retrieve push token:', tokenError);
        this.isNotificationsAvailable = false;
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      this.isNotificationsAvailable = false;
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
      const token = await Notifications.getExpoPushTokenAsync();
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
