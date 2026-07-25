import { Router } from 'express';
import * as FolderController from '../controllers/folder.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All of these routes are protected and require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/folders
 * @desc    Create a new folder for the authenticated user.
 * @access  Private
 */
router.post('/', FolderController.createFolder);

/**
 * @route   GET /api/v1/folders
 * @desc    Get all folders for the authenticated user.
 * @access  Private
 */
router.get('/', FolderController.getFolders);

/**
 * @route   PUT /api/v1/folders/:folderId
 * @desc    Update a folder for the authenticated user.
 * @access  Private
 */
router.put('/:folderId', FolderController.updateFolder);

/**
 * @route   DELETE /api/v1/folders/:folderId
 * @desc    Soft delete a folder for the authenticated user.
 * @access  Private
 */
router.delete('/:folderId', FolderController.deleteFolder);

export default router;

