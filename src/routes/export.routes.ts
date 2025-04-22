import express from 'express';
import * as exportController from '../controllers/export.controller';
import { authenticateJWT, requireAdmin } from '../middleware/auth';
import { validateQuery, exportSchemas } from '../middleware/validation';
import { addOrganizationToRequest } from '../middleware/organization-auth';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// Export chats and messages
router.get('/chats', authenticateJWT, requireAdmin, validateQuery(exportSchemas.chatExport), asyncHandler(addOrganizationToRequest), asyncHandler(exportController.exportChatsWithMessages));

// Export user activity data
router.get('/users/activity', authenticateJWT, requireAdmin, validateQuery(exportSchemas.userActivity), asyncHandler(addOrganizationToRequest), asyncHandler(exportController.exportUserActivity));

export default router;
