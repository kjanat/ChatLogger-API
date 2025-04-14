const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticateJWT, authenticateApiKey } = require('../middleware/auth');
const { addOrganizationToRequest } = require('../middleware/organization-auth');
const { validate, validateQuery, validateObjectId, messageSchemas } = require('../middleware/validation');

// Authentication middleware - accept either JWT or API Key
const auth = [
    (req, res, next) => {
        authenticateJWT(req, res, (err) => {
            if (!err) return next();
            authenticateApiKey(req, res, next);
        });
    }
];

router.post('/:chatId', auth, validateObjectId('chatId'), addOrganizationToRequest, validate(messageSchemas.create), messageController.addMessage);

router.post('/batch/:chatId', auth, validateObjectId('chatId'), addOrganizationToRequest, validate(messageSchemas.batchCreate), messageController.batchAddMessages);

router.get('/:chatId', auth, validateObjectId('chatId'), addOrganizationToRequest, validateQuery(messageSchemas.pagination), messageController.getChatMessages);

router.get('/:chatId/:messageId', auth, validateObjectId('chatId'), validateObjectId('messageId'), addOrganizationToRequest, messageController.getMessageById);

router.put('/:chatId/:messageId', auth, validateObjectId('chatId'), validateObjectId('messageId'), addOrganizationToRequest, validate(messageSchemas.update), messageController.updateMessage);

router.delete('/:chatId/:messageId', auth, validateObjectId('chatId'), validateObjectId('messageId'), addOrganizationToRequest, messageController.deleteMessage);

module.exports = router;
