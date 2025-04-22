import express from 'express';
import * as organizationController from '../controllers/organization.controller';
import { authenticateJWT, requireSuperAdmin } from '../middleware/auth';
import { validate, validateObjectId, organizationSchemas } from '../middleware/validation';
import { addOrganizationToRequest } from '../middleware/organization-auth';
import paginationMiddleware from '../middleware/pagination';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// --- Superadmin only Routes ---
router.post('/', authenticateJWT, requireSuperAdmin, validate(organizationSchemas.create), asyncHandler(organizationController.createOrganization));
router.get('/', 
    authenticateJWT, 
    requireSuperAdmin, 
    paginationMiddleware(),
    asyncHandler(organizationController.getOrganizations)
);
router.delete('/:id', authenticateJWT, requireSuperAdmin, validateObjectId('id'), asyncHandler(organizationController.deleteOrganization));


// --- Admin Only Routes ---
// (Superadmins usually inherit admin rights, check middleware if specific exclusion needed)
// No specific admin-only routes remain after removing deactivate/reactivate


// --- Organization Member/Admin Routes (Accessible by users within their own organization) ---

// Get specific organization by ID (Middleware `addOrganizationToRequest` likely handles fetching/validating)
// If ID matches user's org, `getOrganizationById` should return it.
router.get('/:id', authenticateJWT, asyncHandler(addOrganizationToRequest), validateObjectId('id'), asyncHandler(organizationController.getOrganizationById));

// Update *own* organization (Middleware `addOrganizationToRequest` validates membership before controller)
router.put('/:id', authenticateJWT, asyncHandler(addOrganizationToRequest), validateObjectId('id'), validate(organizationSchemas.update), asyncHandler(organizationController.updateOrganization));

// Regenerate API Key for *own* organization (Middleware `addOrganizationToRequest` validates membership)
router.post('/:id/regenerate-key', authenticateJWT, asyncHandler(addOrganizationToRequest), validateObjectId('id'), asyncHandler(organizationController.regenerateApiKey));

export default router;
