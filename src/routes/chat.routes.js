const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticateJWT, authenticateApiKey } = require('../middleware/auth');
const { addOrganizationToRequest } = require('../middleware/organization-auth');
const { validate, validateQuery, validateObjectId, chatSchemas } = require('../middleware/validation');

// Authentication middleware - accept either JWT or API Key
const auth = [
    (req, res, next) => {
        authenticateJWT(req, res, (err) => {
            if (!err) return next();
            authenticateApiKey(req, res, next);
        });
    }
];

router.post('/', auth, addOrganizationToRequest, validate(chatSchemas.create), chatController.createChat);

router.get('/', auth, addOrganizationToRequest, validateQuery(chatSchemas.pagination), chatController.getUserChats);

router.get('/search', auth, addOrganizationToRequest, validateQuery(chatSchemas.search), chatController.searchChats);

router.get('/:chatId', auth, validateObjectId('chatId'), addOrganizationToRequest, chatController.getChatById);

router.put('/:chatId', auth, validateObjectId('chatId'), addOrganizationToRequest, validate(chatSchemas.update), chatController.updateChat);

router.delete('/:chatId', auth, validateObjectId('chatId'), addOrganizationToRequest, chatController.deleteChat);

module.exports = router;
