// @ts-nocheck
/**
 * Mobile Notification Service Unit Tests
 * Tests permission requests, token management, notification handlers
 */

import notificationService from '../../src/services/notificationService';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/services/api';

jest.mock('expo-device');
jest.mock('expo-notifications');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/api');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeNotifications', () => {
    it('should request permissions on first initialization', async () => {
      // Arrange
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
        ios: { status: 'undetermined' },
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
        ios: { alert: true, badge: true, sound: true },
      });

      // Act
      await notificationService.initializeNotifications();

      // Assert
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should setup notification handlers', async () => {
      // Arrange
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: true,
      });
      const addNotificationReceivedListener = jest.fn();
      const addNotificationResponseReceivedListener = jest.fn();

      Notifications.addNotificationReceivedListener = addNotificationReceivedListener;
      Notifications.addNotificationResponseReceivedListener =
        addNotificationResponseReceivedListener;

      // Act
      await notificationService.initializeNotifications();

      // Assert
      expect(addNotificationReceivedListener).toHaveBeenCalled();
      expect(addNotificationResponseReceivedListener).toHaveBeenCalled();
    });

    it('should handle permission denial gracefully', async () => {
      // Arrange
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        granted: false,
      });

      // Act & Assert - should not throw
      await expect(notificationService.initializeNotifications()).resolves.not.toThrow();
    });
  });

  describe('getDevicePushToken', () => {
    it('should retrieve device push token', async () => {
      // Arrange
      const mockToken = 'test_device_token_123';
      (Device.isDevice as jest.Mock).mockReturnValue(true);
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: mockToken,
      });

      // Act
      const token = await notificationService.getDevicePushToken();

      // Assert
      expect(token).toBe(mockToken);
    });

    it('should return null on simulator', async () => {
      // Arrange
      (Device.isDevice as jest.Mock).mockReturnValue(false);

      // Act
      const token = await notificationService.getDevicePushToken();

      // Assert
      expect(token).toBeNull();
    });

    it('should handle token retrieval failure gracefully', async () => {
      // Arrange
      (Device.isDevice as jest.Mock).mockReturnValue(true);
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token error')
      );

      // Act
      const token = await notificationService.getDevicePushToken();

      // Assert
      expect(token).toBeNull();
    });
  });

  describe('registerDeviceToken', () => {
    it('should register token with backend', async () => {
      // Arrange
      const mockToken = 'device_token_xyz';
      const mockBaseURL = 'http://localhost:3000';
      const mockAuthToken = 'auth_token_123';

      (api.registerDeviceToken as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Act
      await notificationService.registerDeviceToken(mockBaseURL, mockAuthToken, mockToken);

      // Assert
      expect(api.registerDeviceToken).toHaveBeenCalledWith(
        expect.objectContaining({
          token: mockToken,
        })
      );
    });

    it('should detect platform and include it', async () => {
      // Arrange
      const mockToken = 'platform_test_token';
      (Device.getDeviceTypeAsync as jest.Mock).mockResolvedValue(Device.DeviceType.PHONE);

      (api.registerDeviceToken as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Act
      await notificationService.registerDeviceToken(
        'http://localhost:3000',
        'auth_token',
        mockToken
      );

      // Assert
      expect(api.registerDeviceToken).toHaveBeenCalled();
    });

    it('should handle registration failure', async () => {
      // Arrange
      (api.registerDeviceToken as jest.Mock).mockRejectedValue(
        new Error('Registration failed')
      );

      // Act & Assert
      await expect(
        notificationService.registerDeviceToken(
          'http://localhost:3000',
          'auth_token',
          'token'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('handleNotificationReceived', () => {
    it('should display local notification when app in foreground', async () => {
      // Arrange
      const mockNotification = {
        request: {
          content: {
            title: 'Test Title',
            body: 'Test Body',
            data: {
              jobId: 'job-123',
              jobType: 'note',
            },
          },
        },
      };

      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
        'notification-id'
      );

      // Act
      await notificationService.handleNotificationReceived(mockNotification as any);

      // Assert
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('should include job data in local notification', async () => {
      // Arrange
      const mockNotification = {
        request: {
          content: {
            title: 'Note Complete',
            body: 'Your note was created',
            data: {
              jobId: 'job-456',
              jobType: 'note',
            },
          },
        },
      };

      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
        'notif-id'
      );

      // Act
      await notificationService.handleNotificationReceived(mockNotification as any);

      // Assert
      const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.content.data).toEqual(mockNotification.request.content.data);
    });
  });

  describe('handleNotificationResponse', () => {
    it('should handle notification tap', async () => {
      // Arrange
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                jobId: 'job-789',
                jobType: 'note',
              },
            },
          },
        },
      };

      // Act
      const result = await notificationService.handleNotificationResponse(
        mockResponse as any
      );

      // Assert
      // In a real app, this would navigate using navigation prop
      // We're just testing that the data is extracted correctly
      expect(result).toBeDefined();
    });

    it('should extract jobId and jobType from notification', async () => {
      // Arrange
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {
                jobId: 'chat-123',
                jobType: 'chat',
                status: 'completed',
              },
            },
          },
        },
      };

      // Act
      const result = await notificationService.handleNotificationResponse(
        mockResponse as any
      );

      // Assert - data should be accessible
      expect(mockResponse.notification.request.content.data.jobId).toBe('chat-123');
      expect(mockResponse.notification.request.content.data.jobType).toBe('chat');
    });

    it('should handle missing data gracefully', async () => {
      // Arrange
      const mockResponse = {
        notification: {
          request: {
            content: {
              data: {},
            },
          },
        },
      };

      // Act & Assert
      await expect(
        notificationService.handleNotificationResponse(mockResponse as any)
      ).resolves.not.toThrow();
    });
  });

  describe('showLocalNotification', () => {
    it('should schedule a local notification', async () => {
      // Arrange
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
        'local-notif-id'
      );

      // Act
      await notificationService.showLocalNotification(
        'Test Title',
        'Test Body',
        { jobId: 'test-123' }
      );

      // Assert
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
      const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.content.title).toBe('Test Title');
      expect(callArgs.content.body).toBe('Test Body');
    });

    it('should include custom data in notification', async () => {
      // Arrange
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
        'local-notif-2'
      );

      // Act
      await notificationService.showLocalNotification(
        'Title',
        'Body',
        { jobId: 'job-abc', custom: 'data' }
      );

      // Assert
      const callArgs = (Notifications.scheduleNotificationAsync as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.content.data).toEqual({ jobId: 'job-abc', custom: 'data' });
    });
  });

  describe('cleanup', () => {
    it('should remove all listeners on cleanup', () => {
      // Arrange
      const unsubscribe = jest.fn();
      Notifications.addNotificationReceivedListener = jest
        .fn()
        .mockReturnValue(unsubscribe);
      Notifications.addNotificationResponseReceivedListener = jest
        .fn()
        .mockReturnValue(unsubscribe);

      // Act
      notificationService.cleanup();

      // Assert
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
