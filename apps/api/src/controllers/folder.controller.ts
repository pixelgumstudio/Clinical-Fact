import { Response } from 'express';
import * as FolderService from '../services/folder.service';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/response';

const CreateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name cannot be empty.'),
  color: z.string().optional(),
  folderType: z.enum(['note', 'chat']).optional(),
});

const UpdateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name cannot be empty.').optional(),
  color: z.string().optional(),
});

/**
 * @description Controller to handle creation of a new folder.
 */
export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, folderType } = CreateFolderSchema.parse(req.body);
    const userId = req.user!._id;

    const folder = await FolderService.createFolder(userId, name, color, folderType);
    res.status(201).json(successResponse(folder, 'Folder created successfully'));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(errorResponse('Validation error', ERROR_CODES.VALIDATION_ERROR));
    }
    res.status(500).json(errorResponse(error.message || 'Error creating folder', ERROR_CODES.SERVER_ERROR));
  }
};

/**
 * @description Controller to get all folders for the authenticated user.
 */
export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const folderType = req.query.folderType as 'note' | 'chat' | undefined;
    const folders = await FolderService.getFolders(userId, folderType);
    res.status(200).json(successResponse(folders, 'Folders retrieved successfully'));
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || 'Error fetching folders', ERROR_CODES.SERVER_ERROR));
  }
};

/**
 * @description Controller to update a folder.
 */
export const updateFolder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { folderId } = req.params;
    const updates = UpdateFolderSchema.parse(req.body);

    if (!folderId) {
      return res.status(400).json(errorResponse('Folder ID is required', ERROR_CODES.VALIDATION_ERROR));
    }

    const updatedFolder = await FolderService.updateFolder(userId, folderId, updates);
    // Return folder data directly (not wrapped in data field) for API compatibility
    res.status(200).json(updatedFolder);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(errorResponse('Validation error', ERROR_CODES.VALIDATION_ERROR));
    }
    if (error.message === 'Folder not found') {
      return res.status(404).json(errorResponse(error.message, ERROR_CODES.NOT_FOUND));
    }
    res.status(500).json(errorResponse(error.message || 'Error updating folder', ERROR_CODES.SERVER_ERROR));
  }
};

/**
 * @description Controller to delete a folder.
 */
export const deleteFolder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { folderId } = req.params;

    if (!folderId) {
      return res.status(400).json(errorResponse('Folder ID is required', ERROR_CODES.VALIDATION_ERROR));
    }

    const result = await FolderService.deleteFolder(userId, folderId);
    res.status(200).json(successResponse(result, 'Folder deleted successfully'));
  } catch (error: any) {
    if (error.message === 'Folder not found') {
      return res.status(404).json(errorResponse(error.message, ERROR_CODES.NOT_FOUND));
    }
    res.status(500).json(errorResponse(error.message || 'Error deleting folder', ERROR_CODES.SERVER_ERROR));
  }
};