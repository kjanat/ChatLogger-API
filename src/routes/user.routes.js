const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { addOrganizationToRequest } = require('../middleware/organization-auth');
const { validate, validateQuery, validateObjectId, userSchemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - organizationId
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: securePwd123
 *               organizationId:
 *                 type: string
 *                 example: 6436e13f2c85a7b3a8d49b03
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or missing organization ID
 *       409:
 *         description: User with this email or username already exists
 *       500:
 *         description: Server error
 */
router.post('/register', validate(userSchemas.register), userController.register);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: securePwd123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', validate(userSchemas.login), userController.login);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/profile', authenticateJWT, userController.getProfile);

/**
 * @swagger
 * /users/generate-api-key:
 *   post:
 *     summary: Generate API key for current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API key generated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/generate-api-key', authenticateJWT, userController.generateApiKey);

/**
 * @swagger
 * /users/organization-users:
 *   get:
 *     summary: Get all users in the organization (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Organization ID (superadmin only)
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 *       500:
 *         description: Server error
 */
router.get('/organization-users', authenticateJWT, requireAdmin, addOrganizationToRequest, userController.getUsersInOrganization);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               role:
 *                 type: string
 *                 enum: [user, admin, superadmin]
 *                 example: user
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to update this user
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticateJWT, validateObjectId('id'), validate(userSchemas.update), addOrganizationToRequest, userController.updateUser);

module.exports = router;
