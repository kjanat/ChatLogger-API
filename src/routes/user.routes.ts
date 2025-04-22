import express from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateJWT, requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { addOrganizationToRequest } from '../middleware/organization-auth';
import { validate, validateQuery, validateObjectId, userSchemas } from '../middleware/validation';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// Registration and authentication
router.post('/register', validate(userSchemas.register), userController.register);
router.post('/login', validate(userSchemas.login), userController.login);
router.get('/profile', authenticateJWT, userController.getProfile);
router.post('/generate-api-key', authenticateJWT, userController.generateApiKey);

// --- Superadmin only Routes ---
// Removed GET /all as no corresponding controller function exists for *all* users across orgs.
// Superadmins can use GET /organization-users?organizationId=<orgId> to target specific orgs.

// --- Admin Routes (within their own organization) ---

// Get all users within the admin's organization
router.get('/organization-users', authenticateJWT, requireAdmin, asyncHandler(addOrganizationToRequest), asyncHandler(userController.getUsersInOrganization));

// Search users within the admin's organization
router.get('/search/users', authenticateJWT, requireAdmin, validateQuery(userSchemas.search), asyncHandler(addOrganizationToRequest), asyncHandler(userController.searchUsers));

// Create a new Admin user within the admin's organization
router.post('/admin/create', authenticateJWT, requireAdmin, validate(userSchemas.create), asyncHandler(addOrganizationToRequest), asyncHandler(userController.createAdminUser));

// --- User Routes (potentially admin or regular user, permissions checked inside controller/middleware) ---

// Get user profile by ID (checks if user is getting self or admin getting user in their org)
router.get('/:id', authenticateJWT, validateObjectId('id'), asyncHandler(addOrganizationToRequest), asyncHandler(userController.getUserById));

// Update user profile (checks if user is updating self or admin updating user in their org)
// This can handle deactivation by setting isActive: false
router.put('/:id', authenticateJWT, validateObjectId('id'), validate(userSchemas.update), asyncHandler(addOrganizationToRequest), asyncHandler(userController.updateUser));

// Removed DELETE /:id route as no `deleteUser` controller exists. Deactivation is handled via PUT.

export default router;
