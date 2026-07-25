/**
 * Notification Service
 * Handles push notifications via Firebase Cloud Messaging (FCM)
 */

import admin from 'firebase-admin';
import Notification from '../models/Notification';
import { User } from '../models/User';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (serviceAccount.project_id) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized');
    } else {
      console.warn('⚠️ Firebase credentials not configured');
    }
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase:', error.message);
  }
}

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>; // FCM only supports string values
}

class NotificationService {
  /**
   * Send job completion notification to a user's devices
   */
  async sendJobCompletionNotification(
    userId: string,
    jobId: string,
    jobType: 'note' | 'chat' | 'quiz' | 'flashcard' | 'youtube',
    status: 'completed' | 'failed'
  ): Promise<boolean> {
    try {
      console.log(`📢 Sending notification for job ${jobId} (${status})`);

      // Get user's device tokens
      const user = await User.findById(userId);
      if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
        console.warn(`⚠️ No device tokens found for user ${userId}`);
        return false;
      }

      // Prepare notification payload
      const title = status === 'completed' ? '✅ Task Complete!' : '❌ Task Failed';
      const statusLabel = status === 'completed' ? 'Completed' : 'Failed';
      const jobLabel = this.getJobLabel(jobType);
      const body =
        status === 'completed'
          ? `Your ${jobLabel} has been successfully created.`
          : `Failed to create your ${jobLabel}. Please try again.`;

      const payload = this.createPayload(title, body, {
        jobId,
        jobType,
        status,
      });

      // Send to all device tokens
      let sentCount = 0;
      const errors: string[] = [];

      for (const deviceToken of user.deviceTokens) {
        try {
          await this.sendToFCM(deviceToken.token, payload);
          sentCount++;
        } catch (error: any) {
          console.error(`❌ Failed to send to token ${deviceToken.token.slice(0, 20)}...`);
          errors.push(error.message);
        }
      }

      // Log notification in database
      await this.logNotification(userId, jobId, jobType, status, sentCount > 0);

      console.log(`✅ Notification sent to ${sentCount}/${user.deviceTokens.length} devices`);
      return sentCount > 0;
    } catch (error: any) {
      console.error('❌ Failed to send job completion notification:', error.message);
      return false;
    }
  }

  /**
   * Send notification via Firebase Cloud Messaging
   */
  private async sendToFCM(deviceToken: string, payload: NotificationPayload): Promise<void> {
    try {
      if (!admin.apps.length) {
        throw new Error('Firebase not initialized');
      }

      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        token: deviceToken,
      };

      const response = await admin.messaging().send(message as any);
      console.log(`📤 FCM message sent: ${response}`);
    } catch (error: any) {
      console.error(`❌ FCM error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get human-readable job label
   */
  private getJobLabel(jobType: string): string {
    const labels: Record<string, string> = {
      note: 'Note',
      chat: 'Chat message',
      quiz: 'Quiz',
      flashcard: 'Flashcard set',
      youtube: 'YouTube note',
    };
    return labels[jobType] || 'Task';
  }

  /**
   * Create notification payload for FCM
   * FCM only supports string values in data field
   */
  private createPayload(
    title: string,
    body: string,
    data?: Record<string, any>
  ): NotificationPayload {
    // Convert data to string-only format for FCM
    const stringData: Record<string, string> = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        stringData[key] = String(value);
      }
    }

    return {
      title,
      body,
      data: stringData,
    };
  }

  /**
   * Log notification in database for tracking
   */
  private async logNotification(
    userId: string,
    jobId: string,
    jobType: string,
    status: string,
    success: boolean
  ): Promise<void> {
    try {
      await Notification.create({
        userId,
        jobId,
        jobType,
        status,
        type: status === 'completed' ? 'job_completed' : 'job_failed',
        title: status === 'completed' ? '✅ Task Complete!' : '❌ Task Failed',
        body:
          status === 'completed'
            ? `Your ${jobType} has been created successfully.`
            : `Failed to create your ${jobType}.`,
        deliveryStatus: success ? 'sent' : 'failed',
        sentAt: success ? new Date() : undefined,
      });

      console.log(`💾 Notification logged in database`);
    } catch (error: any) {
      console.error('❌ Failed to log notification:', error.message);
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(): Promise<void> {
    try {
      const failedNotifications = await Notification.find({
        deliveryStatus: 'failed',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      });

      console.log(`🔄 Retrying ${failedNotifications.length} failed notifications`);

      for (const notification of failedNotifications) {
        try {
          const user = await User.findById(notification.userId);
          if (!user || !user.deviceTokens) continue;

          const payload = this.createPayload(notification.title, notification.body, {
            jobId: notification.jobId,
            jobType: notification.jobType,
          });

          for (const deviceToken of user.deviceTokens) {
            await this.sendToFCM(deviceToken.token, payload);
          }

          // Update notification status
          notification.deliveryStatus = 'sent';
          notification.sentAt = new Date();
          await notification.save();

          console.log(`✅ Retried notification ${notification._id}`);
        } catch (error: any) {
          console.error(`❌ Retry failed for notification ${notification._id}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to retry notifications:', error.message);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    try {
      const total = await Notification.countDocuments({ userId });
      const sent = await Notification.countDocuments({ userId, deliveryStatus: 'sent' });
      const failed = await Notification.countDocuments({ userId, deliveryStatus: 'failed' });
      const pending = await Notification.countDocuments({ userId, deliveryStatus: 'pending' });

      return { total, sent, failed, pending };
    } catch (error: any) {
      console.error('❌ Failed to get notification stats:', error.message);
      return { total: 0, sent: 0, failed: 0, pending: 0 };
    }
  }
}

export default new NotificationService();
