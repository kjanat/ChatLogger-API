// filepath: c:\Users\kjana\Projects\ChatLogger\src\routes\export.routes.js
const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { addOrganizationToRequest } = require('../middleware/organization-auth');

router.get('/chats', authenticateJWT, requireAdmin, addOrganizationToRequest, exportController.exportChatsAndMessages);

router.get('/users/activity', authenticateJWT, requireAdmin, addOrganizationToRequest, exportController.exportUserActivity);

module.exports = router;
