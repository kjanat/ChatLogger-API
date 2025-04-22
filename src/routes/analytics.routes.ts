import express, { Request, Response, NextFunction } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticateJWT, requireAdmin } from '../middleware/auth';
import { validateQuery, analyticsSchemas } from '../middleware/validation';
import { addOrganizationToRequest } from '../middleware/organization-auth';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// Get activity metrics (chats and messages over time)
router.get(
    '/activity',
    authenticateJWT,
    requireAdmin,
    validateQuery(analyticsSchemas.activity),
    asyncHandler(addOrganizationToRequest),
    asyncHandler(analyticsController.getChatActivityByDate)
);

// Get message statistics by role
router.get(
    '/messages/stats',
    authenticateJWT,
    requireAdmin,
    validateQuery(analyticsSchemas.messageStats),
    asyncHandler(addOrganizationToRequest),
    asyncHandler(analyticsController.getMessageStatsByRole)
);

// Get top users by activity
router.get(
    '/users/top',
    authenticateJWT,
    requireAdmin,
    validateQuery(analyticsSchemas.topUsers),
    asyncHandler(addOrganizationToRequest),
    asyncHandler(analyticsController.getTopUsersByActivity)
);

export default router;
