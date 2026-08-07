/**
 * User Routes
 * Handles user account operations including device token registration
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { User } from '../models/User';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response';

const router = Router();

/**
 * POST /api/v1/user/device-tokens
 * Register a device push token
 */
router.post(
  '/device-tokens',
  authenticate,
  async (req: any, res: Response) => {
    try {
      const userId = req.user?._id;
      const { token, platform, deviceName } = req.body;

      if (!token || !platform) {
        return res.status(400).json(
          errorResponse('Token and platform are required', ERROR_CODES.VALIDATION_ERROR)
        );
      }

      if (!['ios', 'android', 'web'].includes(platform)) {
        return res.status(400).json(
          errorResponse('Invalid platform. Must be ios, android, or web', ERROR_CODES.VALIDATION_ERROR)
        );
      }

      // Find user and add/update device token
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json(errorResponse('User not found', ERROR_CODES.NOT_FOUND));
      }

      // Check if token already exists for this user
      const existingTokenIndex = user.deviceTokens.findIndex((dt) => dt.token === token);

      if (existingTokenIndex >= 0) {
        // Update existing token's registration date
        user.deviceTokens[existingTokenIndex].platform = platform;
        user.deviceTokens[existingTokenIndex].deviceName = deviceName;
        user.deviceTokens[existingTokenIndex].registeredAt = new Date();
      } else {
        // Add new token
        user.deviceTokens.push({
          token,
          platform,
          deviceName,
          registeredAt: new Date(),
        });
      }

      await user.save();

      console.log(`✅ Device token registered for user ${userId}`);

      res.status(201).json(
        successResponse(
          {
            tokenCount: user.deviceTokens.length,
            devices: user.deviceTokens.map((dt) => ({
              platform: dt.platform,
              deviceName: dt.deviceName,
              registeredAt: dt.registeredAt,
            })),
          },
          'Device token registered successfully'
        )
      );
    } catch (error: any) {
      console.error('❌ Error registering device token:', error.message);
      res.status(500).json(errorResponse(error.message, ERROR_CODES.SERVER_ERROR));
    }
  }
);

/**
 * DELETE /api/v1/user/device-tokens/:token
 * Unregister a device push token
 */
router.delete(
  '/device-tokens/:token',
  authenticate,
  async (req: any, res: Response) => {
    try {
      const userId = req.user?._id;
      const { token } = req.params;

      if (!token) {
        return res.status(400).json(
          errorResponse('Token is required', ERROR_CODES.VALIDATION_ERROR)
        );
      }

      // Find user and remove device token
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json(errorResponse('User not found', ERROR_CODES.NOT_FOUND));
      }

      // Remove token
      const initialLength = user.deviceTokens.length;
      user.deviceTokens = user.deviceTokens.filter((dt) => dt.token !== token);

      // Only save if token was actually found and removed
      if (user.deviceTokens.length < initialLength) {
        await user.save();
        console.log(`✅ Device token unregistered for user ${userId}`);

        res.status(200).json(
          successResponse(
            {
              tokenCount: user.deviceTokens.length,
            },
            'Device token unregistered successfully'
          )
        );
      } else {
        res.status(404).json(errorResponse('Token not found for this user', ERROR_CODES.NOT_FOUND));
      }
    } catch (error: any) {
      console.error('❌ Error unregistering device token:', error.message);
      res.status(500).json(errorResponse(error.message, ERROR_CODES.SERVER_ERROR));
    }
  }
);

/**
 * GET /api/v1/user/device-tokens
 * Get all registered device tokens for the user
 */
router.get(
  '/device-tokens',
  authenticate,
  async (req: any, res: Response) => {
    try {
      const userId = req.user?._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json(errorResponse('User not found', ERROR_CODES.NOT_FOUND));
      }

      const devices = user.deviceTokens.map((dt) => ({
        platform: dt.platform,
        deviceName: dt.deviceName,
        registeredAt: dt.registeredAt,
      }));

      res.status(200).json(
        successResponse(
          {
            devices,
            count: devices.length,
          },
          'Device tokens retrieved successfully'
        )
      );
    } catch (error: any) {
      console.error('❌ Error retrieving device tokens:', error.message);
      res.status(500).json(errorResponse(error.message, ERROR_CODES.SERVER_ERROR));
    }
  }
);

export default router;
