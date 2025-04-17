// filepath: c:\Users\kjana\Projects\ChatLogger\src\routes\analytics.routes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { addOrganizationToRequest } = require('../middleware/organization-auth');

router.get(
    '/activity',
    authenticateJWT,
    requireAdmin,
    addOrganizationToRequest,
    analyticsController.getChatActivityByDate,
);

router.get(
    '/messages/stats',
    authenticateJWT,
    requireAdmin,
    addOrganizationToRequest,
    analyticsController.getMessageStatsByRole,
);

router.get(
    '/users/top',
    authenticateJWT,
    requireAdmin,
    addOrganizationToRequest,
    analyticsController.getTopUsersByActivity,
);

module.exports = router;
