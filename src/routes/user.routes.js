const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { addOrganizationToRequest } = require('../middleware/organization-auth');
const { validate, validateQuery, validateObjectId, userSchemas } = require('../middleware/validation');

// Registration and authentication
router.post('/register', validate(userSchemas.register), userController.register);
router.post('/login', validate(userSchemas.login), userController.login);
router.get('/profile', authenticateJWT, userController.getProfile);
router.post('/generate-api-key', authenticateJWT, userController.generateApiKey);

// User management (admin only)
router.get('/organization-users', authenticateJWT, requireAdmin, addOrganizationToRequest, userController.getUsersInOrganization);

// Search users with filtering - Admin only (must be before /:id route)
router.get('/search/users', authenticateJWT, requireAdmin, validateQuery(userSchemas.search), addOrganizationToRequest, userController.searchUsers);

// Create admin/superadmin user - Superadmin only or admin for regular user creation
router.post('/admin/create', authenticateJWT, requireAdmin, validate(userSchemas.create), addOrganizationToRequest, userController.createAdminUser);

// Get user by ID - Accessible to admins or the user themselves
router.get('/:id', authenticateJWT, validateObjectId('id'), addOrganizationToRequest, userController.getUserById);

// Update user - Accessible to admins or the user themselves
router.put('/:id', authenticateJWT, validateObjectId('id'), validate(userSchemas.update), addOrganizationToRequest, userController.updateUser);

module.exports = router;
