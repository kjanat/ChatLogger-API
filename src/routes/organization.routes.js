const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organization.controller');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { addOrganizationToRequest } = require('../middleware/organization-auth');
const { validate, validateObjectId, organizationSchemas } = require('../middleware/validation');

router.post(
    '/',
    authenticateJWT,
    requireAdmin,
    validate(organizationSchemas.create),
    organizationController.createOrganization,
);

router.get('/', authenticateJWT, requireAdmin, organizationController.getAllOrganizations);

router.get(
    '/current',
    authenticateJWT,
    addOrganizationToRequest,
    organizationController.getCurrentOrganization,
);

router.get(
    '/:id',
    authenticateJWT,
    validateObjectId('id'),
    addOrganizationToRequest,
    organizationController.getOrganizationById,
);

router.put(
    '/:id',
    authenticateJWT,
    validateObjectId('id'),
    addOrganizationToRequest,
    validate(organizationSchemas.update),
    organizationController.updateOrganization,
);

router.post(
    '/:id/regenerate-api-key',
    authenticateJWT,
    validateObjectId('id'),
    addOrganizationToRequest,
    organizationController.regenerateApiKey,
);

module.exports = router;
