import express from 'express';
import * as messageController from '../controllers/message.controller';
import { authenticateJWT } from '../middleware/auth';
import { validate, validateQuery, validateObjectId, messageSchemas } from '../middleware/validation';
import paginationMiddleware from '../middleware/pagination';
import { addOrganizationToRequest } from '../middleware/organization-auth';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// Add a message to a chat
router.post('/:chatId', authenticateJWT, validateObjectId('chatId'), asyncHandler(addOrganizationToRequest), validate(messageSchemas.create), asyncHandler(messageController.addMessage));

// Add multiple messages in a batch
router.post('/batch/:chatId', authenticateJWT, validateObjectId('chatId'), asyncHandler(addOrganizationToRequest), validate(messageSchemas.batchCreate), asyncHandler(messageController.batchAddMessages));

// Get all messages for a chat
router.get('/:chatId', authenticateJWT, validateObjectId('chatId'), asyncHandler(addOrganizationToRequest), paginationMiddleware(), asyncHandler(messageController.getChatMessages));

// Get a specific message
router.get('/:chatId/:messageId', authenticateJWT, validateObjectId('chatId'), validateObjectId('messageId'), asyncHandler(addOrganizationToRequest), asyncHandler(messageController.getMessageById));

// Update a message
router.put('/:chatId/:messageId', authenticateJWT, validateObjectId('chatId'), validateObjectId('messageId'), asyncHandler(addOrganizationToRequest), validate(messageSchemas.update), asyncHandler(messageController.updateMessage));

// Delete a message
router.delete('/:chatId/:messageId', authenticateJWT, validateObjectId('chatId'), validateObjectId('messageId'), asyncHandler(addOrganizationToRequest), asyncHandler(messageController.deleteMessage));

export default router;
