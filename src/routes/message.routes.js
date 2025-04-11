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

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Chat message management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       required:
 *         - chatId
 *         - role
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated message ID
 *         chatId:
 *           type: string
 *           description: ID of the chat this message belongs to
 *         role:
 *           type: string
 *           enum: [system, user, assistant, function, tool]
 *           description: Role of the message sender
 *         content:
 *           type: string
 *           description: Message content
 *         name:
 *           type: string
 *           description: Name attribute for function or tool messages
 *         functionCall:
 *           type: object
 *           description: Function call details
 *         toolCalls:
 *           type: array
 *           items:
 *             type: object
 *           description: Tool calls details
 *         metadata:
 *           type: object
 *           description: Additional data about the message
 *         tokens:
 *           type: integer
 *           description: Total token count
 *         promptTokens:
 *           type: integer
 *           description: Prompt token count
 *         completionTokens:
 *           type: integer
 *           description: Completion token count
 *         latency:
 *           type: integer
 *           description: Latency in milliseconds
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the message was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the message was last updated
 *       example:
 *         _id: 60d21b4667d0d8992e610c86
 *         chatId: 60d21b4667d0d8992e610c85
 *         role: user
 *         content: How do I reset my password?
 *         metadata: { source: "web" }
 *         tokens: 10
 *         promptTokens: 10
 *         completionTokens: 0
 *         latency: 150
 *         createdAt: 2023-04-11T10:02:00Z
 *         updatedAt: 2023-04-11T10:02:00Z
 */

/**
 * @swagger
 * /messages/{chatId}:
 *   post:
 *     summary: Create a new message in the chat
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - content
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [system, user, assistant, function, tool]
 *                 description: Role of the message sender
 *               content:
 *                 type: string
 *                 description: Message content
 *               name:
 *                 type: string
 *                 description: Name attribute for function or tool messages
 *               functionCall:
 *                 type: object
 *                 description: Function call details
 *               toolCalls:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Tool calls details
 *               metadata:
 *                 type: object
 *                 description: Additional data about the message
 *               tokens:
 *                 type: integer
 *                 description: Total token count
 *               promptTokens:
 *                 type: integer
 *                 description: Prompt token count
 *               completionTokens:
 *                 type: integer
 *                 description: Completion token count
 *               latency:
 *                 type: integer
 *                 description: Latency in milliseconds
 *     responses:
 *       201:
 *         description: Message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 messageObj:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid input or missing chat ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.post('/:chatId', auth, validateObjectId('chatId'), addOrganizationToRequest, validate(messageSchemas.create), messageController.addMessage);

/**
 * @swagger
 * /messages/batch/{chatId}:
 *   post:
 *     summary: Create multiple messages in a chat
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - role
 *                     - content
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [system, user, assistant, function, tool]
 *                     content:
 *                       type: string
 *                     name:
 *                       type: string
 *                     functionCall:
 *                       type: object
 *                     toolCalls:
 *                       type: array
 *                       items:
 *                         type: object
 *                     metadata:
 *                       type: object
 *                     tokens:
 *                       type: integer
 *                     promptTokens:
 *                       type: integer
 *                     completionTokens:
 *                       type: integer
 *                     latency:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Messages created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid input or missing chat ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.post('/batch/:chatId', auth, validateObjectId('chatId'), addOrganizationToRequest, validate(messageSchemas.batchCreate), messageController.batchAddMessages);

/**
 * @swagger
 * /messages/{chatId}:
 *   get:
 *     summary: Get all messages from a chat
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
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
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, role]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 totalMessages:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.get('/:chatId', auth, validateObjectId('chatId'), addOrganizationToRequest, validateQuery(messageSchemas.pagination), messageController.getChatMessages);

/**
 * @swagger
 * /messages/{chatId}/{messageId}:
 *   get:
 *     summary: Get a specific message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *       - in: path
 *         name: messageId
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.get('/:chatId/:messageId', auth, validateObjectId('chatId'), validateObjectId('messageId'), addOrganizationToRequest, messageController.getMessageById);

/**
 * @swagger
 * /messages/{chatId}/{messageId}:
 *   put:
 *     summary: Update a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *       - in: path
 *         name: messageId
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated message content
 *               metadata:
 *                 type: object
 *                 description: Updated metadata
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updatedMessage:
 *                   $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.put('/:chatId/:messageId', auth, validateObjectId('chatId'), validateObjectId('messageId'), addOrganizationToRequest, validate(messageSchemas.update), messageController.updateMessage);

/**
 * @swagger
 * /messages/{chatId}/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *       - in: path
 *         name: messageId
 *         schema:
 *           type: string
 *         required: true
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */
router.delete('/:chatId/:messageId', auth, validateObjectId('chatId'), validateObjectId('messageId'), addOrganizationToRequest, messageController.deleteMessage);

module.exports = router;
