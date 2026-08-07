import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Feedback } from '../models/Feedback';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response';

export const submitFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { noteId, isPositive, comment } = req.body;

    if (typeof isPositive !== 'boolean') {
      res.status(400).json(errorResponse('isPositive must be a boolean', ERROR_CODES.VALIDATION_ERROR));
      return;
    }

    if (!isPositive) {
      await Feedback.create({
        userId,
        noteId: noteId ? new mongoose.Types.ObjectId(noteId) : undefined,
        isPositive: false,
        comment: comment?.toString().trim() || undefined,
      });
    }

    const currentYear = new Date().getFullYear();
    const user = await User.findById(userId).select('reviewStatus');

    const lastPromptYear = user?.reviewStatus?.lastPromptedDate
      ? new Date(user.reviewStatus.lastPromptedDate).getFullYear()
      : null;

    const promptsThisYear =
      lastPromptYear === currentYear
        ? (user?.reviewStatus?.promptsThisYear ?? 0) + 1
        : 1;

    await User.findByIdAndUpdate(userId, {
      $set: {
        'reviewStatus.lastPromptedDate': new Date(),
        'reviewStatus.promptsThisYear': promptsThisYear,
        ...(isPositive ? {} : { 'reviewStatus.hasOptedOut': true }),
      },
    });

    res.status(200).json(successResponse(null, 'Feedback recorded'));
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || 'Error recording feedback', ERROR_CODES.SERVER_ERROR));
  }
};
