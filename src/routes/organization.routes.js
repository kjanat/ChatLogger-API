const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organization.controller');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { 
  addOrganizationToRequest, 
  authenticateOrganization 
} = require('../middleware/organization-auth');
const { validate, validateObjectId, organizationSchemas } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Organization management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Organization:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated organization ID
 *         name:
 *           type: string
 *           description: Organization name
 *         apiKeys:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: API key name or description
 *               key:
 *                 type: string
 *                 description: Actual API key (partially hidden)
 *         isActive:
 *           type: boolean
 *           description: Whether the organization is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the organization was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the organization was last updated
 *       example:
 *         _id: 60d21b4667d0d8992e610c83
 *         name: Acme Corp
 *         apiKeys: [{ name: "Production API", key: "api_...3jd8" }]
 *         isActive: true
 *         createdAt: 2023-04-11T09:00:00Z
 *         updatedAt: 2023-04-11T09:00:00Z
 */

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create a new organization (superadmin only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization name
 *                 example: Acme Corp
 *               apiKeys:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Production API
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a superadmin
 *       500:
 *         description: Server error
 */
router.post('/', authenticateJWT, requireAdmin, validate(organizationSchemas.create), organizationController.createOrganization);

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get all organizations (superadmin only)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a superadmin
 *       500:
 *         description: Server error
 */
router.get('/', authenticateJWT, requireAdmin, organizationController.getAllOrganizations);

/**
 * @swagger
 * /api/organizations/current:
 *   get:
 *     summary: Get the current user's organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Server error
 */
router.get('/current', authenticateJWT, addOrganizationToRequest, organizationController.getCurrentOrganization);

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Get an organization by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to view this organization
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticateJWT, validateObjectId('id'), addOrganizationToRequest, organizationController.getOrganizationById);

/**
 * @swagger
 * /api/organizations/{id}:
 *   put:
 *     summary: Update an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated organization name
 *               isActive:
 *                 type: boolean
 *                 description: Updated active status
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to update this organization
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticateJWT, validateObjectId('id'), addOrganizationToRequest, validate(organizationSchemas.update), organizationController.updateOrganization);

/**
 * @swagger
 * /api/organizations/{id}/regenerate-api-key:
 *   post:
 *     summary: Regenerate API key for an organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyName
 *             properties:
 *               keyName:
 *                 type: string
 *                 description: Name for the new API key
 *     responses:
 *       200:
 *         description: API key regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 apiKey:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     key:
 *                       type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to regenerate API key
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Server error
 */
router.post('/:id/regenerate-api-key', authenticateJWT, validateObjectId('id'), addOrganizationToRequest, organizationController.regenerateApiKey);

module.exports = router;
